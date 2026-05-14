# Contributing

Thanks for your interest in improving Startup Discord Bot.

## Development setup

1. Fork and clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

4. Add your Discord bot token, client ID, and test server ID to `.env`.
5. Register slash commands and start the bot:

   ```bash
   npm run deploy
   npm run dev
   ```

## Before opening a pull request

- Run `npm run check`.
- Keep changes focused and explain the user-facing behavior in the pull request.
- Do not commit `.env`, tokens, generated `data/` files, logs, or local process files.
- Update the README when you add, remove, or rename a command.

## Reporting bugs

Open an issue with:

- What command or setup step failed.
- What you expected to happen.
- What actually happened.
- Relevant logs with tokens and server IDs removed.
