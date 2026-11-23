---
name: dev-server
description: >-
  Manage the local Angular drawing app dev server across conversations using dev.py.
  Use when the user asks to start, stop, restart, inspect status, view logs, or open
  the running drawing application.
---

# Dev Server Management (`dev.py`)

This workspace includes `dev.py` at the repository root to run the Angular dev server as a detached process with state stored in `.dev/server.json` and logs in `.dev/server.log`.

## Commands

Run all commands from the repository root (`c:\src\drawing\git`):

1. **Check status** (always safe and idempotent; cleans stale state if the process died):
   ```powershell
   python dev.py status --json
   ```
2. **Start the app** (detached by default; waits until HTTP is ready):
   ```powershell
   python dev.py start
   ```
   Optional flags: `--port 4200`, `--host localhost`, `--open`, `--foreground`.
3. **Stop the app** (kills the entire Node/Angular process tree):
   ```powershell
   python dev.py stop
   ```
4. **Restart the app** (preserves host/port unless overridden):
   ```powershell
   python dev.py restart
   ```
5. **Inspect logs** (useful if compilation fails or startup times out):
   ```powershell
   python dev.py logs --lines 50
   ```
6. **Print or open URL**:
   ```powershell
   python dev.py url
   python dev.py open
   ```

## Workflow Guidelines

- Check `python dev.py status --json` first instead of guessing whether the app is already running.
- `python dev.py start` defaults to port `4200` and automatically falls back to the next free port (e.g. `4201`) if `4200` is occupied by another project, so always read the active URL from `python dev.py status --json` or `python dev.py url` rather than hardcoding `4200`.
- Never start duplicate `yarn start` or `ng serve` processes outside `dev.py`.
- If the user asks to view or interact with the app in the browser, ensure it is running via `python dev.py start`, read the URL from `python dev.py url`, and delegate visual browser interaction to the browser subagent.
