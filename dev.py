#!/usr/bin/env python3
"""Cross-conversation manager for the Angular drawing app dev server."""

from __future__ import annotations

import argparse
import ctypes
import ctypes.wintypes
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DEV_DIR = ROOT / ".dev"
STATE_FILE = DEV_DIR / "server.json"
LOG_FILE = DEV_DIR / "server.log"
NG_CLI_JS = ROOT / "node_modules" / "@angular" / "cli" / "bin" / "ng.js"

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 4200
DEFAULT_TIMEOUT = 60.0

PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
STILL_ACTIVE = 259


def _setup_win32_kernel32() -> Any | None:
    if sys.platform != "win32":
        return None
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.OpenProcess.argtypes = [
        ctypes.wintypes.DWORD,
        ctypes.wintypes.BOOL,
        ctypes.wintypes.DWORD,
    ]
    kernel32.OpenProcess.restype = ctypes.wintypes.HANDLE

    kernel32.CloseHandle.argtypes = [ctypes.wintypes.HANDLE]
    kernel32.CloseHandle.restype = ctypes.wintypes.BOOL

    kernel32.GetExitCodeProcess.argtypes = [
        ctypes.wintypes.HANDLE,
        ctypes.POINTER(ctypes.wintypes.DWORD),
    ]
    kernel32.GetExitCodeProcess.restype = ctypes.wintypes.BOOL

    kernel32.GetProcessTimes.argtypes = [
        ctypes.wintypes.HANDLE,
        ctypes.POINTER(ctypes.wintypes.FILETIME),
        ctypes.POINTER(ctypes.wintypes.FILETIME),
        ctypes.POINTER(ctypes.wintypes.FILETIME),
        ctypes.POINTER(ctypes.wintypes.FILETIME),
    ]
    kernel32.GetProcessTimes.restype = ctypes.wintypes.BOOL
    return kernel32


_KERNEL32 = _setup_win32_kernel32()


def get_process_created_at(pid: int) -> int | None:
    """Return an OS creation timestamp for PID-reuse detection on Windows."""
    if _KERNEL32 is None or pid <= 0:
        return None
    handle = _KERNEL32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        return None
    try:
        creation = ctypes.wintypes.FILETIME()
        exit_time = ctypes.wintypes.FILETIME()
        kernel_time = ctypes.wintypes.FILETIME()
        user_time = ctypes.wintypes.FILETIME()
        if not _KERNEL32.GetProcessTimes(
            handle,
            ctypes.byref(creation),
            ctypes.byref(exit_time),
            ctypes.byref(kernel_time),
            ctypes.byref(user_time),
        ):
            return None
        return (creation.dwHighDateTime << 32) | creation.dwLowDateTime
    finally:
        _KERNEL32.CloseHandle(handle)


def is_process_alive(pid: int, expected_created_at: int | None = None) -> bool:
    """Check whether a process is alive and matches its recorded creation time."""
    if pid <= 0:
        return False

    if _KERNEL32 is not None:
        handle = _KERNEL32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return False
        try:
            exit_code = ctypes.wintypes.DWORD()
            if not _KERNEL32.GetExitCodeProcess(handle, ctypes.byref(exit_code)):
                return False
            if exit_code.value != STILL_ACTIVE:
                return False
            if expected_created_at is not None:
                creation = ctypes.wintypes.FILETIME()
                exit_time = ctypes.wintypes.FILETIME()
                kernel_time = ctypes.wintypes.FILETIME()
                user_time = ctypes.wintypes.FILETIME()
                if not _KERNEL32.GetProcessTimes(
                    handle,
                    ctypes.byref(creation),
                    ctypes.byref(exit_time),
                    ctypes.byref(kernel_time),
                    ctypes.byref(user_time),
                ):
                    return False
                actual_created_at = (creation.dwHighDateTime << 32) | creation.dwLowDateTime
                if actual_created_at != expected_created_at:
                    return False
            return True
        finally:
            _KERNEL32.CloseHandle(handle)

    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def read_state() -> dict[str, Any] | None:
    if not STATE_FILE.is_file():
        return None
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def write_state(state: dict[str, Any]) -> None:
    DEV_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = DEV_DIR / f"server.json.{os.getpid()}.tmp"
    tmp_path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp_path, STATE_FILE)


def remove_state() -> None:
    try:
        STATE_FILE.unlink()
    except FileNotFoundError:
        pass


def get_live_state() -> dict[str, Any] | None:
    state = read_state()
    if state is None:
        return None
    pid = state.get("pid")
    created_at = state.get("process_created_at")
    if isinstance(pid, int) and is_process_alive(
        pid, created_at if isinstance(created_at, int) else None
    ):
        return state
    remove_state()
    return None


def candidate_hosts(host: str) -> list[str]:
    lower = host.lower()
    if lower == "localhost" or host in ("0.0.0.0", "::"):
        return ["127.0.0.1", "::1"]
    return [host]


def build_url(host: str, port: int) -> str:
    display = "localhost" if host in ("0.0.0.0", "::") else host
    if ":" in display and not display.startswith("["):
        display = f"[{display}]"
    return f"http://{display}:{port}"


def is_port_open(host: str, port: int, timeout: float = 0.35) -> bool:
    for target in candidate_hosts(host):
        try:
            with socket.create_connection((target, port), timeout=timeout):
                return True
        except OSError:
            continue
    return False


def find_available_port(
    host: str, start_port: int = DEFAULT_PORT, max_attempts: int = 100
) -> int | None:
    for offset in range(max_attempts):
        candidate = start_port + offset
        if candidate > 65535:
            break
        if not is_port_open(host, candidate):
            return candidate
    return None


def probe_http(host: str, port: int, timeout: float = 0.5) -> bool:
    for target in candidate_hosts(host):
        url_host = f"[{target}]" if ":" in target else target
        req = urllib.request.Request(f"http://{url_host}:{port}/", method="GET")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if 200 <= resp.status < 500:
                    return True
        except urllib.error.HTTPError as err:
            if 200 <= err.code < 500:
                return True
        except (urllib.error.URLError, OSError, TimeoutError):
            continue
    return False


def find_node_executable() -> str:
    node_path = shutil.which("node")
    if not node_path:
        raise RuntimeError("Could not find 'node' on PATH.")
    real_path = os.path.realpath(node_path)
    return real_path if os.path.isfile(real_path) else node_path


def build_child_env() -> dict[str, str]:
    env = os.environ.copy()
    env["NG_CLI_ANALYTICS"] = "false"
    env["NO_COLOR"] = "1"
    env["FORCE_COLOR"] = "0"
    return env


def read_last_lines(path: Path, count: int) -> list[str]:
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if count <= 0:
        return lines
    return lines[-count:]


def print_log_tail(count: int = 30, stream: Any = None) -> None:
    target = stream or sys.stderr
    lines = read_last_lines(LOG_FILE, count)
    if lines:
        print(f"--- Last {len(lines)} lines of {LOG_FILE} ---", file=target)
        for line in lines:
            print(line, file=target)


def terminate_process_tree(
    pid: int, created_at: int | None, timeout: float = 10.0
) -> bool:
    if not is_process_alive(pid, created_at):
        return True

    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            text=True,
            check=False,
        )
    else:
        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            return True
        except PermissionError:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                return True

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not is_process_alive(pid, created_at):
            return True
        time.sleep(0.1)

    if sys.platform != "win32":
        try:
            os.killpg(pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                return True
        kill_deadline = time.monotonic() + 2.0
        while time.monotonic() < kill_deadline:
            if not is_process_alive(pid, created_at):
                return True
            time.sleep(0.1)

    return not is_process_alive(pid, created_at)


def cmd_start(args: argparse.Namespace) -> int:
    existing = get_live_state()
    if existing is not None:
        if (args.host is not None and args.host != existing["host"]) or (
            args.port is not None and args.port != existing["port"]
        ):
            print(
                f"Warning: dev server is already running at {existing['url']} "
                f"(PID {existing['pid']}); use 'restart' to change host/port.",
                file=sys.stderr,
            )
        print(f"Dev server already running at {existing['url']} (PID {existing['pid']})")
        if args.open:
            webbrowser.open(existing["url"])
        return 0

    host = args.host or DEFAULT_HOST
    if args.port is not None:
        port = args.port
        if is_port_open(host, port):
            print(
                f"Error: {host}:{port} is already in use by another process not managed by dev.py.",
                file=sys.stderr,
            )
            return 1
    else:
        port = DEFAULT_PORT
        if is_port_open(host, port):
            fallback = find_available_port(host, DEFAULT_PORT + 1)
            if fallback is None:
                print(
                    f"Error: no available port found starting from {DEFAULT_PORT} on {host}.",
                    file=sys.stderr,
                )
                return 1
            print(f"Port {DEFAULT_PORT} is in use; using available port {fallback}.")
            port = fallback

    if not NG_CLI_JS.is_file():
        print(
            f"Error: Angular CLI not found at {NG_CLI_JS}. Run 'yarn install' first.",
            file=sys.stderr,
        )
        return 1

    try:
        node_exe = find_node_executable()
    except RuntimeError as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1

    cmd = [node_exe, str(NG_CLI_JS), "serve", "--host", host, "--port", str(port)]
    url = build_url(host, port)
    env = build_child_env()
    DEV_DIR.mkdir(parents=True, exist_ok=True)

    if args.foreground:
        proc = subprocess.Popen(cmd, cwd=str(ROOT), env=env)
        created_at = get_process_created_at(proc.pid)
        write_state(
            {
                "pid": proc.pid,
                "process_created_at": created_at,
                "host": host,
                "port": port,
                "url": url,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "log_file": None,
                "command": cmd,
            }
        )
        try:
            return proc.wait()
        except KeyboardInterrupt:
            terminate_process_tree(proc.pid, created_at, timeout=5.0)
            return 0
        finally:
            remove_state()

    popen_kwargs: dict[str, Any] = {
        "cwd": str(ROOT),
        "env": env,
        "stdin": subprocess.DEVNULL,
        "stderr": subprocess.STDOUT,
        "close_fds": True,
    }
    if sys.platform == "win32":
        popen_kwargs["creationflags"] = (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        )
    else:
        popen_kwargs["start_new_session"] = True

    log_fp = LOG_FILE.open("w", encoding="utf-8")
    try:
        popen_kwargs["stdout"] = log_fp
        proc = subprocess.Popen(cmd, **popen_kwargs)
    finally:
        log_fp.close()

    created_at = get_process_created_at(proc.pid)
    write_state(
        {
            "pid": proc.pid,
            "process_created_at": created_at,
            "host": host,
            "port": port,
            "url": url,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "log_file": str(LOG_FILE),
            "command": cmd,
        }
    )

    deadline = time.monotonic() + args.timeout
    while time.monotonic() < deadline:
        if proc.poll() is not None or not is_process_alive(proc.pid, created_at):
            remove_state()
            print("Error: dev server exited before becoming ready.", file=sys.stderr)
            print_log_tail(30, stream=sys.stderr)
            return 1
        if probe_http(host, port):
            if args.open:
                webbrowser.open(url)
            print(f"Dev server started at {url} (PID {proc.pid})")
            print(f"Logs: {LOG_FILE}")
            return 0
        time.sleep(0.25)

    terminate_process_tree(proc.pid, created_at, timeout=5.0)
    remove_state()
    print(
        f"Error: timed out after {args.timeout:g}s waiting for dev server at {url}.",
        file=sys.stderr,
    )
    print_log_tail(30, stream=sys.stderr)
    return 1


def cmd_stop(args: argparse.Namespace) -> int:
    state = get_live_state()
    if state is None:
        print("Dev server is not running.")
        return 0

    pid = state["pid"]
    created_at = state.get("process_created_at")
    if not terminate_process_tree(
        pid,
        created_at if isinstance(created_at, int) else None,
        timeout=args.timeout,
    ):
        print(f"Error: failed to stop dev server (PID {pid}).", file=sys.stderr)
        return 1

    port_deadline = time.monotonic() + 2.0
    while time.monotonic() < port_deadline and is_port_open(
        state["host"], state["port"], timeout=0.15
    ):
        time.sleep(0.1)

    remove_state()
    print(f"Stopped dev server (PID {pid}).")
    return 0


def cmd_restart(args: argparse.Namespace) -> int:
    prev = get_live_state() or read_state()
    host = args.host if args.host is not None else (prev.get("host") if prev else None)
    port = args.port if args.port is not None else (prev.get("port") if prev else None)

    stop_rc = cmd_stop(argparse.Namespace(timeout=10.0))
    if stop_rc != 0:
        return stop_rc

    return cmd_start(
        argparse.Namespace(
            host=host,
            port=port,
            timeout=args.timeout,
            open=args.open,
            foreground=False,
        )
    )


def cmd_status(args: argparse.Namespace) -> int:
    state = get_live_state()
    if state is None:
        payload = {
            "running": False,
            "http_ready": False,
            "pid": None,
            "host": None,
            "port": None,
            "url": None,
            "started_at": None,
            "log_file": str(LOG_FILE),
        }
        if args.json:
            print(json.dumps(payload, indent=2))
        else:
            print("Dev server is not running.")
        return 0

    http_ready = probe_http(state["host"], state["port"])
    payload = {
        "running": True,
        "http_ready": http_ready,
        "pid": state["pid"],
        "host": state["host"],
        "port": state["port"],
        "url": state["url"],
        "started_at": state.get("started_at"),
        "log_file": state.get("log_file") or str(LOG_FILE),
    }
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        readiness = "HTTP ready" if http_ready else "starting / not responding"
        print(f"Status: running ({readiness})")
        print(f"URL:    {payload['url']}")
        print(f"PID:    {payload['pid']}")
        print(f"Logs:   {payload['log_file']}")
    return 0


def cmd_logs(args: argparse.Namespace) -> int:
    if not LOG_FILE.is_file():
        print(f"No dev server log file found at {LOG_FILE}.")
        return 0

    for line in read_last_lines(LOG_FILE, args.lines):
        print(line)

    if not args.follow:
        return 0

    try:
        with LOG_FILE.open("r", encoding="utf-8", errors="replace") as fp:
            fp.seek(0, os.SEEK_END)
            while True:
                chunk = fp.read()
                if chunk:
                    sys.stdout.write(chunk)
                    sys.stdout.flush()
                else:
                    time.sleep(0.25)
    except KeyboardInterrupt:
        return 0


def cmd_url(_args: argparse.Namespace) -> int:
    state = get_live_state()
    if state is None:
        print("Dev server is not running.", file=sys.stderr)
        return 1
    print(state["url"])
    return 0


def cmd_open(_args: argparse.Namespace) -> int:
    state = get_live_state()
    if state is None:
        print("Dev server is not running.", file=sys.stderr)
        return 1
    webbrowser.open(state["url"])
    print(f"Opened {state['url']}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Manage the Angular drawing app dev server across sessions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_start = sub.add_parser("start", help="Start the dev server (detached by default).")
    p_start.add_argument("--host", default=None, help=f"Bind host (default: {DEFAULT_HOST}).")
    p_start.add_argument(
        "--port", type=int, default=None, help=f"Listen port (default: {DEFAULT_PORT})."
    )
    p_start.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help=f"Seconds to wait for HTTP readiness (default: {int(DEFAULT_TIMEOUT)}).",
    )
    p_start.add_argument("--open", action="store_true", help="Open URL in browser once ready.")
    p_start.add_argument(
        "--foreground",
        action="store_true",
        help="Run attached in the foreground instead of detaching.",
    )
    p_start.set_defaults(func=cmd_start)

    p_stop = sub.add_parser("stop", help="Stop the running dev server.")
    p_stop.add_argument(
        "--timeout", type=float, default=10.0, help="Seconds to wait for exit (default: 10)."
    )
    p_stop.set_defaults(func=cmd_stop)

    p_restart = sub.add_parser("restart", help="Restart the dev server.")
    p_restart.add_argument("--host", default=None, help="Override bind host.")
    p_restart.add_argument("--port", type=int, default=None, help="Override listen port.")
    p_restart.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help=f"Seconds to wait for HTTP readiness (default: {int(DEFAULT_TIMEOUT)}).",
    )
    p_restart.add_argument("--open", action="store_true", help="Open URL in browser once ready.")
    p_restart.set_defaults(func=cmd_restart)

    p_status = sub.add_parser("status", help="Show whether the dev server is running.")
    p_status.add_argument("--json", action="store_true", help="Emit JSON status output.")
    p_status.set_defaults(func=cmd_status)

    p_logs = sub.add_parser("logs", help="Show dev server logs.")
    p_logs.add_argument(
        "-n",
        "--lines",
        type=int,
        default=50,
        help="Number of trailing lines to print, or 0 for all (default: 50).",
    )
    p_logs.add_argument("-f", "--follow", action="store_true", help="Follow log output.")
    p_logs.set_defaults(func=cmd_logs)

    p_url = sub.add_parser("url", help="Print the running dev server URL.")
    p_url.set_defaults(func=cmd_url)

    p_open = sub.add_parser("open", help="Open the running dev server in the browser.")
    p_open.set_defaults(func=cmd_open)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
