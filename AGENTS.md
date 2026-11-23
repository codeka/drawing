# Drawing Workspace Rules

## Managing the Running App

Always manage the Angular dev server through `python dev.py` at the repository root so its PID, port, and logs persist in `.dev/` and remain controllable across conversations.

- Do **not** launch `yarn start`, `npm start`, or `ng serve` directly as ad-hoc background tasks.
- Check status before starting or opening the app: `python dev.py status --json`
- Start detached: `python dev.py start`
- Stop: `python dev.py stop`
- Restart: `python dev.py restart`
- View logs: `python dev.py logs --lines 50`
- Get URL: `python dev.py url`
