## VROOM setup (self-hosted)

This repo already contains **`vroom-express/`** (Node wrapper around the VROOM binary).

### Option A (fastest): run `vroom-express` locally

1) Edit `vroom-express/config.yml`:

- Set `routingServers.osrm.car.host` to `localhost`
- Keep port `5000` (matches `infra/docker-compose.yml`)

2) Start it:

```bash
cd ../vroom-express
npm install
npm start
```

VROOM-Express listens on the port configured in `config.yml` (default **3005**).

### Option B: containerize later

For a college MVP, Option A is simplest and still **self-hosted** (no paid APIs).
If you want, we can add a Dockerfile for `vroom-express` in this workspace once OSRM is stable.

