#!/usr/bin/env python3
"""
Build data/puzzles.json for Puzzle Arena from the Lichess puzzle database.

The Lichess puzzle database is released under CC0:
  https://database.lichess.org/#puzzles   (lichess_db_puzzle.csv.zst, ~3M+ puzzles)

Usage
-----
  # 1. download (only the first ~25 MB is enough for a few hundred thousand puzzles)
  curl -r 0-20971519 https://database.lichess.org/lichess_db_puzzle.csv.zst -o puzzles.csv.zst

  # 2. decompress (pip install zstandard)
  python3 - <<'PY'
  import zstandard
  d = zstandard.ZstdDecompressor()
  with open('puzzles.csv.zst','rb') as f, open('puzzles.csv','wb') as o:
      r = d.stream_reader(f)
      try:
          while True:
              c = r.read(1 << 20)
              if not c: break
              o.write(c)
      except Exception:
          pass   # truncated stream is expected when using a byte range
  PY

  # 3. curate
  python3 scripts/build-puzzles.py puzzles.csv

What it does
------------
* keeps only well-played, well-liked puzzles (popularity >= 92, plays >= 500, deviation <= 90)
* samples a balanced set over rating buckets *and* themes so every theme is playable
* writes a minified data/puzzles.json + data/manifest.json (theme counts)
"""
from __future__ import annotations

import csv
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

MIN_POPULARITY = 92
MIN_PLAYS = 500
MAX_RD = 90
TOTAL_TARGET = 6000
PER_THEME_BUCKET = 6
BUCKET = 200
RANDOM_SEED = 20240517

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data"


def main() -> int:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "puzzles.csv")
    if not src.exists():
        print(f"missing input csv: {src}", file=sys.stderr)
        return 1

    rows: list[dict] = []
    with src.open(newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if not (r.get("Themes") and r.get("Moves") and r.get("FEN")):
                continue  # last line of a truncated download
            try:
                pop, plays, rd, rating = (
                    int(r["Popularity"]),
                    int(r["NbPlays"]),
                    int(r["RatingDeviation"]),
                    int(r["Rating"]),
                )
            except (TypeError, ValueError):
                continue
            if pop < MIN_POPULARITY or plays < MIN_PLAYS or rd > MAX_RD:
                continue
            rows.append(
                {
                    "id": r["PuzzleId"],
                    "fen": r["FEN"],
                    "moves": r["Moves"],
                    "rating": rating,
                    "themes": r["Themes"].split(),
                    "popularity": pop,
                    "plays": plays,
                    "gameUrl": r.get("GameUrl") or "",
                    "opening": (r.get("OpeningTags") or "").split()[0] if r.get("OpeningTags") else "",
                }
            )

    print(f"candidate puzzles: {len(rows)}")
    rng = random.Random(RANDOM_SEED)

    by_bucket: dict[int, list[dict]] = defaultdict(list)
    for p in rows:
        by_bucket[p["rating"] // BUCKET].append(p)
    for v in by_bucket.values():
        rng.shuffle(v)

    chosen: dict[str, dict] = {}
    # --- pass 1: guarantee theme coverage across every rating bucket ---------
    theme_names = sorted({t for p in rows for t in p["themes"]})
    for theme in theme_names:
        for bucket in sorted(by_bucket):
            picked = 0
            for p in by_bucket[bucket]:
                if picked >= PER_THEME_BUCKET:
                    break
                if theme in p["themes"] and p["id"] not in chosen:
                    chosen[p["id"]] = p
                    picked += 1

    # --- pass 2: fill up to TOTAL_TARGET with a rating-flat random sample ----
    pool = list(rows)
    rng.shuffle(pool)
    for p in pool:
        if len(chosen) >= TOTAL_TARGET:
            break
        chosen.setdefault(p["id"], p)

    puzzles = sorted(chosen.values(), key=lambda p: (p["rating"], p["id"]))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "puzzles.json").write_text(
        json.dumps(puzzles, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
    )

    counts = Counter(t for p in puzzles for t in p["themes"])
    manifest = {
        "count": len(puzzles),
        "source": "lichess_db_puzzle (CC0)",
        "ratingRange": [puzzles[0]["rating"], puzzles[-1]["rating"]],
        "themes": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    size_mb = (OUT_DIR / "puzzles.json").stat().st_size / 1e6
    print(f"wrote {len(puzzles)} puzzles ({size_mb:.2f} MB) -> {OUT_DIR/'puzzles.json'}")
    print(f"themes covered: {len(counts)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
