## OSRM setup (one-time per city extract)

### 1) Download an OSM extract

For Ahmedabad-like scale, use a Gujarat or Ahmedabad extract (PBF). Place it as:

- `infra/osrm-data/region.osm.pbf`

### 2) Preprocess with OSRM (MLD)

From `infra/` run:

```bash
docker run -t -v "${PWD}/osrm-data:/data" osrm/osrm-backend:latest osrm-extract -p /opt/car.lua /data/region.osm.pbf
docker run -t -v "${PWD}/osrm-data:/data" osrm/osrm-backend:latest osrm-partition /data/region.osrm
docker run -t -v "${PWD}/osrm-data:/data" osrm/osrm-backend:latest osrm-customize /data/region.osrm
```

This creates `region.osrm*` files in `infra/osrm-data/`.

### 3) Start OSRM + Mongo

```bash
docker compose up -d
```

OSRM will be available at:

- `http://localhost:5000`

