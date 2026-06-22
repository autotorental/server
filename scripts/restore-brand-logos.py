#!/usr/bin/env python3
"""Restore missing brand logo files referenced in the database."""
from __future__ import annotations

import subprocess
import urllib.error
import urllib.request
from pathlib import Path

UPLOAD_DIR = Path("/opt/autorental/uploads")
LOGO_BASE = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/thumb"

# Slugs that differ in the public logo dataset.
SLUG_ALIASES = {
    "range-rover": "land-rover",
}


def load_brands() -> list[tuple[str, str]]:
    out = subprocess.check_output(
        [
            "psql",
            "-h",
            "localhost",
            "-U",
            "autorental",
            "-d",
            "autorental_db",
            "-t",
            "-A",
            "-c",
            "SELECT slug, logo_url FROM brand WHERE logo_url IS NOT NULL ORDER BY slug;",
        ],
        env={"PGPASSWORD": "vqrmVQLK5iEunWCcliSMrjyu"},
        text=True,
    )
    rows: list[tuple[str, str]] = []
    for line in out.strip().splitlines():
        if "|" not in line:
            continue
        slug, logo_url = line.split("|", 1)
        rows.append((slug.strip(), logo_url.strip()))
    return rows


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "autorental-restore/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        dest.write_bytes(resp.read())


def main() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ok = fail = skip = 0

    for slug, logo_url in load_brands():
        filename = logo_url.rsplit("/", 1)[-1]
        dest = UPLOAD_DIR / filename
        if dest.exists() and dest.stat().st_size > 0:
            skip += 1
            continue

        source_slug = SLUG_ALIASES.get(slug, slug)
        url = f"{LOGO_BASE}/{source_slug}.png"
        try:
            download(url, dest)
            print(f"restored {slug} -> {filename}")
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"FAILED {slug} ({url}): HTTP {e.code}")
            fail += 1
        except Exception as e:  # noqa: BLE001
            print(f"FAILED {slug}: {e}")
            fail += 1

    print(f"done: restored={ok} skipped={skip} failed={fail}")


if __name__ == "__main__":
    main()
