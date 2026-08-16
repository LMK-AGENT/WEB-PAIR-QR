# Render deployment notes

This pairing service is intended to run as a Render Web Service.

## Required settings
- Runtime: Node
- Build command: `npm install`
- Start command: use the project's existing production start command after dependency audit.
- Bind the HTTP server to `0.0.0.0` and use Render's `PORT` environment variable.

## Secrets
Never commit WhatsApp authentication/session credentials.
Use Render environment variables for secrets.

## Session handling
The project scope uses Base64 session transport and does not require an Omega account or Omega API.

## Operational requirements
Pairing requests should be rate-limited, temporary authentication state should be cleaned up, and sensitive session data must not be written to normal logs.
