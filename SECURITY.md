# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security-sensitive reports.

Email Soham Dutta or use a private GitHub security advisory if the repository has advisories enabled. Include:

- The affected command or setup flow.
- Steps to reproduce the issue.
- The potential impact.
- Any suggested fix, if you have one.

## Secrets

This project uses a Discord bot token through `.env`. Never commit real tokens, server IDs, or local runtime data.

If a token is exposed, rotate it immediately in the Discord Developer Portal and redeploy with the new token.
