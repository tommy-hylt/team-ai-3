---
name: use-google-cli
description: Use the Google Workspace CLI (gws) to interact with Google services (Drive, Gmail, Sheets, etc.) via the command line. Invoke this skill when the user asks to perform any Google Workspace operation.
---

# Google Workspace CLI (gws)

`gws` is already installed globally on this machine.

**GitHub (read for full command reference):** https://github.com/googleworkspace/cli

## Usage

```
gws <service> <resource> [sub-resource] <method> [flags]
```

## When invoked

1. Fetch the GitHub README (or relevant section) to find the exact command for the task.
2. Run `gws schema <service.resource.method>` to inspect parameters if needed.
3. Execute the command.

## Auth

OAuth credentials are already configured. If a command returns an auth error, ask the user to run `gws auth login`.

## Notes

- `--upload <PATH>` for file uploads (multipart)
- `--params <JSON>` for query/URL parameters
- `--json <JSON>` for request body
