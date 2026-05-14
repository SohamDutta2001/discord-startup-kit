# Startup Discord Bot

[![CI](https://github.com/SohamDutta2001/discord-startup-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/SohamDutta2001/discord-startup-kit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2)](https://discord.js.org)

A self-hosted Discord bot that turns any server into a structured startup workspace — with slash commands for daily ops, team management, project tracking, async communication, polls, and KPI logging.

Built for early-stage teams that need fewer tools, not more.

---

## Features

- **One-command server setup** — creates all channels, categories, roles, and permissions instantly
- **Daily ops** — standup templates, async updates, blocker tracking, wins board
- **Project management** — create and archive project channels with a single command
- **Team onboarding** — assign roles and post a welcome checklist in one step
- **Async-first workflows** — ideas, decisions, investor updates, and weekly reviews all have dedicated modal forms
- **Polls** — create team votes with emoji reactions directly in any channel
- **Metrics** — log KPIs and weekly numbers to a dedicated `#metrics` channel
- **Shoutouts** — publicly recognize teammates in `#wins`
- **Scheduled standups** — auto-post the standup template at a set time each day

---

## Commands

| Command | Who can use | Description |
|---|---|---|
| `/setup-gambit` | Manage Server | Creates all channels, roles, and permissions |
| `/daily-standup` | Everyone | Posts the standup template in `#daily-standup` |
| `/daily-update` | Everyone | Opens a form and posts to `#daily-updates` |
| `/idea` | Everyone | Opens a form and posts to `#new-ideas` |
| `/decision` | Everyone | Logs a decision to `#tech-decisions` or `#strategy` |
| `/blocker` | Everyone | Opens a form and posts to `#blockers`, optionally tags Core Team |
| `/weekly-review` | Everyone | Creates a review thread in the current channel |
| `/poll` | Everyone | Creates a team poll with up to 4 options and emoji reactions |
| `/shoutout` | Everyone | Recognizes a teammate publicly in `#wins` |
| `/metrics` | Everyone | Opens a form and logs a KPI update to `#metrics` |
| `/retro` | Everyone | Opens a retrospective form and creates a summary thread |
| `/okr` | Everyone | Opens a form and logs an OKR to `#okrs` |
| `/agenda` | Everyone | Adds an item to the next meeting agenda in `#agenda` |
| `/bug-report` | Everyone | Opens a structured bug form and posts to `#bugs-and-issues` |
| `/create-project` | Manage Channels | Creates a project category with `#overview`, `#tasks`, `#updates`, `#bugs` |
| `/archive-project` | Manage Channels | Moves a project category's channels into `ARCHIVE` |
| `/onboard-member` | Manage Roles | Assigns a role and posts a welcome checklist |
| `/investor-update` | Everyone | Opens a form and posts a formatted update to `#strategy` |
| `/clean-server` | Manage Channels | Reports empty or unused channels (read-only scan) |
| `/standup-reminder` | Manage Server | Schedules the daily standup post while the bot is running |

---

## Quick Start

### 1. Create the bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, add a bot and copy the token.
3. Copy the application **Client ID** from the General Information page.
4. In Discord, enable **Developer Mode** (User Settings → Advanced) and right-click your server to copy the **Server ID**.

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_GUILD_ID=your_server_id
SERVER_NAME=Your Startup Name
```

### 3. Invite the bot

In the Developer Portal, go to **OAuth2 → URL Generator**. Select:

- Scopes: `bot`, `applications.commands`
- Bot permissions:

| Permission | Required for |
|---|---|
| Manage Channels | Creating and archiving project channels |
| Manage Roles | Onboarding members |
| View Channels | Reading channel state |
| Send Messages | Posting updates and templates |
| Add Reactions | Attaching emoji reactions to polls |
| Read Message History | Finding existing channels |

After inviting, go to **Server Settings → Roles** and drag the bot's role above any roles it needs to manage.

### 4. Install and run

```bash
npm install
npm run deploy   # registers slash commands with Discord (re-run after adding commands)
npm start        # starts the bot
```

For development with auto-reload:

```bash
npm run dev
```

### 5. Set up your server

In Discord, run:

```
/setup-gambit
```

This creates all channels, roles, and permissions. It is safe to re-run — existing channels and roles are reused by name.

---

## Server Structure

`/setup-gambit` builds out:

**Roles** — Founder · Core Team · Engineering · Product · Growth · Advisor · Intern · Guest

**Categories and channels:**

| Category | Channels |
|---|---|
| WELCOME | `#start-here`, `#announcements` (Core-only posting), `#team-directory` |
| DAILY OPS | `#daily-standup`, `#daily-updates`, `#blockers`, `#wins`, `#metrics` |
| PRODUCT | `#product-roadmap`, `#feature-ideas`, `#feedback`, `#bugs-and-issues` |
| ENGINEERING | `#engineering`, `#deployments`, `#code-reviews`, `#tech-decisions` |
| GROWTH / BUSINESS | `#sales` *, `#marketing`, `#partnerships` *, `#customer-support` |
| STRATEGY | `#new-ideas`, `#strategy` *, `#okrs`, `#competitors`, `#meeting-notes`, `#agenda` |
| VOICE | Daily Standup, Founder Room *, Product Sync, Deep Work |

\* Private — visible only to **Founder** and **Core Team** roles.

---

## Requirements

- Node.js 22 or later
- A Discord account and a server where you have admin access

---

## Notes

- The standup reminder uses the local time of the machine running the bot and only fires while the process is active.
- Reminder state is persisted to `data/reminders.json` (gitignored).
- All commands that post to a channel require `/setup-gambit` to have been run first.
- Keep your real `.env` file private. If a Discord bot token is ever exposed, rotate it in the Discord Developer Portal.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

For bugs, include the command or setup step that failed, what you expected, what happened, and any relevant logs with tokens removed.

---

## Security

Please do not open public issues for security-sensitive reports. See [SECURITY.md](SECURITY.md) for the reporting process.

---

## Author

Created and maintained by **Soham Dutta**.

---

## License

MIT - see [LICENSE](LICENSE).
