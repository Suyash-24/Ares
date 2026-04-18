# Self-Host Lavalink (Recommended)

Public Lavalink nodes can be unstable or blocked from cloud providers.
Running Lavalink on the same host as the bot is the most reliable setup.

## Option 1: Docker (fastest)

1. Install Docker if needed.
2. Create Lavalink config:

```bash
mkdir -p ~/lavalink
cat > ~/lavalink/application.yml <<'YAML'
server:
  port: 2333

lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      soundcloud: true
      bandcamp: true
      twitch: true
      vimeo: true
      http: true
      local: false
YAML
```

3. Run Lavalink v4:

```bash
docker run -d \
  --name lavalink \
  --restart unless-stopped \
  -p 2333:2333 \
  -v ~/lavalink/application.yml:/opt/Lavalink/application.yml \
  ghcr.io/lavalink-devs/lavalink:4
```

4. Verify Lavalink is up:

```bash
curl -s http://127.0.0.1:2333/version
```

## Bot configuration

Use either `config.json` or `.env`.

### config.json

```json
{
  "lavalink": {
    "nodes": [
      {
        "identifier": "Localhost",
        "host": "127.0.0.1",
        "port": 2333,
        "password": "youshallnotpass",
        "secure": false
      }
    ]
  }
}
```

### .env

```env
LAVALINK_NODES=[{"name":"Localhost","host":"127.0.0.1","port":2333,"password":"youshallnotpass","secure":false}]
DISABLE_POSTGRES=true
```

Then restart the bot with environment refresh:

```bash
pm2 restart ares-bot --update-env
pm2 logs ares-bot --lines 100
```

## Notes

- If you are not using PostgreSQL, keep `DISABLE_POSTGRES=true`.
- If you do use PostgreSQL, remove `DISABLE_POSTGRES` and set a full valid `DATABASE_URL` or DB credentials with a real password.
