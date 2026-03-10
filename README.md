# Discord Bot: Slash Command -> Private DM from MySQL

This bot listens for a command in a server channel and sends the requesting user their data in a private DM.

## Features

- Slash command: `/grade-lookup`
- Takes `custom_id` as input (example: `18016062`)
- Looks up by custom ID in MySQL database
- Sends database record to the sender via DM
- Sends an ephemeral response in channel to confirm DM was sent
- Can be restricted to one channel with `ALLOWED_CHANNEL_ID`

## 1. Install

```bash
npm install
```

## 2. Configure

Copy `.env.example` to `.env` and update values:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=
ALLOWED_CHANNEL_ID=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=discord_bot
SCHEMA_FILE=./data/schema.sql
```

Create your database first (once):

```sql
CREATE DATABASE discord_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Run migration (create tables from schema.sql)

```bash
npm run migrate
```

This command reads `SCHEMA_FILE` (default: `./data/schema.sql`) and creates the tables in your MySQL database.

## 4. Seed database

```bash
npm run init-db
```

Then edit `src/init-db.js` and replace sample `custom_id` values with your real IDs.

## 5. Run bot

```bash
npm start
```

## Discord Bot Portal settings

No privileged intents are required for this implementation.

## Bot permissions in server

At minimum:

- View Channels
- Send Messages
- Read Message History

## Usage

In a server channel where the bot can read/write:

```text
/grade-lookup custom_id:18016062
```

The bot will DM the user with the matched database info.

If `ALLOWED_CHANNEL_ID` is set, the command only works in that channel.
