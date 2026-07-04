#!/usr/bin/env python3
"""
Export Overture Maps "Places" for given African countries to newline-delimited
JSON, read straight from Overture's public S3 parquet (no auth, no cloud infra).

Usage: python export-overture.py <out.ndjson> <CC> [CC ...]
  e.g. python export-overture.py set.ndjson GH RW BW LS

Each output line: {id,name,lon,lat,category,phone,website,email,locality,region,
country,confidence}. Consumed by import-overture.js through the existing pipeline.
"""
import duckdb, sys, time, os

if len(sys.argv) < 3:
    print("usage: python export-overture.py <out.ndjson> <CC> [CC ...]", file=sys.stderr)
    sys.exit(1)

out = sys.argv[1]
ccs = tuple(c.upper() for c in sys.argv[2:])
RELEASE = os.environ.get("OVERTURE_RELEASE", "2026-06-17.0")
glob = f"s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*.parquet"

con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
t = time.time()
print(f"Exporting Overture Places {ccs} from release {RELEASE} ...", flush=True)
in_list = "(" + ",".join(f"'{c}'" for c in ccs) + ")"
con.execute(f"""
  COPY (
    SELECT id,
           names.primary AS name,
           round((bbox.xmin+bbox.xmax)/2, 6) AS lon,
           round((bbox.ymin+bbox.ymax)/2, 6) AS lat,
           categories.primary AS category,
           list_extract(phones, 1)    AS phone,
           list_extract(websites, 1)  AS website,
           list_extract(emails, 1)    AS email,
           addresses[1].locality AS locality,
           addresses[1].region   AS region,
           addresses[1].country  AS country,
           confidence
    FROM read_parquet('{glob}')
    WHERE addresses[1].country IN {in_list} AND names.primary IS NOT NULL
  ) TO '{out}' (FORMAT JSON)
""")
n = con.execute(f"SELECT count(*) FROM read_json_auto('{out}')").fetchone()[0]
print(f"[done in {time.time()-t:.0f}s] rows={n:,} file={os.path.getsize(out)/1e6:.0f}MB -> {out}", flush=True)
