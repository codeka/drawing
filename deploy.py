#!/usr/bin/env python3
"""Build, package, and optionally upload a production release zip via scp."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NG_CLI_JS = ROOT / "node_modules" / "@angular" / "cli" / "bin" / "ng.js"
BUILD_DIR = ROOT / "dist" / "drawing" / "browser"
DEFAULT_ZIP_PATH = ROOT / "dist" / "draw-deploy.zip"
DEFAULT_SERVER = "web@draw.codeka.com"
DEFAULT_REMOTE_PATH = "/home/web/draw-deploy.zip"
DEFAULT_WEB_DIR = "/home/web/draw"
DEFAULT_RELOAD_COMMAND = "sudo systemctl reload nginx"


def find_node_executable() -> str:
    """Locate the Node.js executable on PATH."""
    node_path = shutil.which("node")
    if not node_path:
        raise RuntimeError("Could not find 'node' on PATH.")
    real_path = os.path.realpath(node_path)
    return real_path if os.path.isfile(real_path) else node_path


def format_size(num_bytes: int) -> str:
    """Format a byte count as a human-readable size string."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    return f"{num_bytes / (1024 * 1024):.2f} MB"


def validate_server(server: str) -> str:
    """Validate and normalize an SSH target of the form [user@]host."""
    cleaned = server.strip()
    if not cleaned:
        raise ValueError("--server cannot be empty.")
    if cleaned.startswith("-"):
        raise ValueError(f"Invalid --server value {server!r}: cannot start with '-'.")
    if any(ch.isspace() for ch in cleaned):
        raise ValueError(f"Invalid --server value {server!r}: cannot contain whitespace.")

    if "@" in cleaned:
        user, host = cleaned.rsplit("@", 1)
        if not user or not host:
            raise ValueError(f"Invalid --server value {server!r}: expected [user@]host.")
    else:
        host = cleaned

    is_bracketed_ipv6 = host.startswith("[") and host.endswith("]") and len(host) > 2
    if ":" in host and not is_bracketed_ipv6:
        raise ValueError(
            f"Invalid --server value {server!r}: pass '[user@]host' without ':' "
            "and use --remote-path to set the destination path."
        )
    return cleaned


def run_release_build() -> None:
    """Run the Angular production build."""
    if not NG_CLI_JS.is_file():
        raise RuntimeError(
            f"Angular CLI not found at {NG_CLI_JS}. Run 'yarn install' first."
        )

    env = os.environ.copy()
    env["NG_CLI_ANALYTICS"] = "false"
    cmd = [find_node_executable(), str(NG_CLI_JS), "build", "--configuration", "production"]
    result = subprocess.run(cmd, cwd=str(ROOT), env=env, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"Production build failed with exit code {result.returncode}."
        )


def create_zip(build_dir: Path, output_path: Path) -> tuple[int, int]:
    """Archive all files inside build_dir into output_path using POSIX archive paths."""
    resolved_build = build_dir.resolve()
    resolved_output = output_path.resolve()

    if not resolved_build.is_dir() or not (resolved_build / "index.html").is_file():
        raise RuntimeError(
            f"Release build output not found at {resolved_build} "
            "(missing index.html). Run without --skip-build first."
        )

    if resolved_output.is_relative_to(resolved_build):
        raise ValueError(
            f"Output zip path {resolved_output} cannot be inside build directory {resolved_build}."
        )

    files = sorted(path for path in resolved_build.rglob("*") if path.is_file())
    if not files:
        raise RuntimeError(f"No files found in release build directory {resolved_build}.")

    resolved_output.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = resolved_output.with_name(f".{resolved_output.name}.{os.getpid()}.tmp")
    try:
        with zipfile.ZipFile(
            tmp_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
        ) as archive:
            for file_path in files:
                archive.write(
                    file_path, arcname=file_path.relative_to(resolved_build).as_posix()
                )
        os.replace(tmp_path, resolved_output)
    except BaseException:
        tmp_path.unlink(missing_ok=True)
        raise

    return len(files), resolved_output.stat().st_size


def upload_zip(
    zip_path: Path,
    server: str,
    remote_path: str,
    port: int | None = None,
    identity: Path | None = None,
) -> None:
    """Copy zip_path to server:remote_path using scp."""
    scp_exe = shutil.which("scp")
    if not scp_exe:
        raise RuntimeError("Could not find 'scp' on PATH.")

    resolved_zip = zip_path.resolve()
    resolved_identity = identity.resolve() if identity is not None else None
    source_arg = f"./{resolved_zip.name}" if ":" in resolved_zip.name else resolved_zip.name

    cmd = [scp_exe]
    if port is not None:
        cmd.extend(["-P", str(port)])
    if resolved_identity is not None:
        cmd.extend(["-i", str(resolved_identity)])
    cmd.extend(["--", source_arg, f"{server}:{remote_path}"])

    result = subprocess.run(cmd, cwd=str(resolved_zip.parent), check=False)
    if result.returncode != 0:
        raise RuntimeError(f"scp upload failed with exit code {result.returncode}.")


def run_remote_command(
    server: str,
    command: str,
    port: int | None = None,
    identity: Path | None = None,
) -> None:
    """Execute a remote command over ssh."""
    ssh_exe = shutil.which("ssh")
    if not ssh_exe:
        raise RuntimeError("Could not find 'ssh' on PATH.")

    resolved_identity = identity.resolve() if identity is not None else None
    cmd = [ssh_exe]
    if port is not None:
        cmd.extend(["-p", str(port)])
    if resolved_identity is not None:
        cmd.extend(["-i", str(resolved_identity)])
    cmd.extend(["--", server, command])

    result = subprocess.run(cmd, cwd=str(ROOT), check=False)
    if result.returncode != 0:
        raise RuntimeError(f"ssh command failed with exit code {result.returncode}.")


def build_parser() -> argparse.ArgumentParser:
    """Build the command-line argument parser."""
    parser = argparse.ArgumentParser(
        description="Build the Angular release bundle, zip it, upload it via scp, and restart the service.",
    )
    parser.add_argument(
        "--server",
        default=DEFAULT_SERVER,
        help=f"SSH target to upload the zip to (default: {DEFAULT_SERVER}).",
    )
    parser.add_argument(
        "--no-upload",
        action="store_true",
        help="Build and package the zip locally without uploading or restarting.",
    )
    parser.add_argument(
        "--no-restart",
        action="store_true",
        help="Upload the zip without restarting the remote service.",
    )
    parser.add_argument(
        "--remote-path",
        default=DEFAULT_REMOTE_PATH,
        help=f"Remote destination path on --server (default: {DEFAULT_REMOTE_PATH}).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=DEFAULT_ZIP_PATH,
        help=f"Local zip output path (default: {DEFAULT_ZIP_PATH}).",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip 'ng build' and package the existing release output in dist/drawing/browser.",
    )
    parser.add_argument(
        "-P",
        "--port",
        type=int,
        default=None,
        help="Optional SSH port passed to scp (-P).",
    )
    parser.add_argument(
        "-i",
        "--identity",
        type=Path,
        default=None,
        help="Optional SSH private key file passed to scp (-i).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """Entry point for the deploy CLI."""
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        server = None if args.no_upload else validate_server(args.server)
        remote_path = args.remote_path.strip()
        if server is not None:
            if not remote_path:
                raise ValueError("--remote-path cannot be empty.")
            if not shutil.which("scp"):
                raise RuntimeError("Could not find 'scp' on PATH.")
            if not args.no_restart and not shutil.which("ssh"):
                raise RuntimeError("Could not find 'ssh' on PATH.")

        if args.port is not None and not (1 <= args.port <= 65535):
            raise ValueError("--port must be between 1 and 65535.")

        identity: Path | None = None
        if args.identity is not None:
            identity = args.identity.resolve()
            if not identity.is_file():
                raise ValueError(f"Identity file not found: {args.identity}")

        output_path = args.output.resolve()
        if output_path.is_relative_to(BUILD_DIR.resolve()):
            raise ValueError(
                f"Output zip path {output_path} cannot be inside build directory {BUILD_DIR.resolve()}."
            )

        if not args.skip_build:
            print("Building release bundle (ng build --configuration production)...", flush=True)
            run_release_build()
        else:
            print(f"Skipping build; packaging existing output from {BUILD_DIR}...", flush=True)

        file_count, zip_size = create_zip(BUILD_DIR, output_path)
        print(f"Created {output_path} ({file_count} files, {format_size(zip_size)}).", flush=True)

        if server is not None:
            print(f"Uploading to {server}:{remote_path}...", flush=True)
            upload_zip(
                output_path,
                server=server,
                remote_path=remote_path,
                port=args.port,
                identity=identity,
            )
            if not args.no_restart:
                remote_cmd = (
                    f"mkdir -p {shlex.quote(DEFAULT_WEB_DIR)} && "
                    f"rm -rf {shlex.quote(DEFAULT_WEB_DIR)}/* && "
                    f"unzip -oq {shlex.quote(remote_path)} -d {shlex.quote(DEFAULT_WEB_DIR)} && "
                    f"{DEFAULT_RELOAD_COMMAND}"
                )
                print(f"Extracting to {DEFAULT_WEB_DIR} and reloading nginx...", flush=True)
                run_remote_command(
                    server=server,
                    command=remote_cmd,
                    port=args.port,
                    identity=identity,
                )
            print(f"Deploy complete: {server}:{remote_path}", flush=True)
        else:
            print("Skipping upload (--no-upload).", flush=True)

        return 0
    except KeyboardInterrupt:
        print("Deploy cancelled.", file=sys.stderr)
        return 130
    except (ValueError, RuntimeError, OSError) as err:
        print(f"Error: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
