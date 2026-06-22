#!/usr/bin/env python3
"""Restore missing city hero images referenced in the database."""
from __future__ import annotations

import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urlparse

UPLOAD_DIR = Path("/opt/autorental/uploads")

# Curated landscape photos (Unsplash, free to use).
CITY_PHOTOS: dict[str, str] = {
    "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=85&auto=format&fit=crop",
    "abu-dhabi": "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=85",
    "sharjah": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=85",
    "ajman": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=85&auto=format&fit=crop",
    "ras-al-khaimah": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=85",
    "fujairah": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85",
    "umm-al-quwain": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7ff05?auto=format&fit=crop&w=1600&q=85",
    "damascus": "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=85",
    "aleppo": "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?auto=format&fit=crop&w=1600&q=85",
}


def load_cities() -> list[tuple[str, str]]:
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
            "SELECT slug, image_url FROM city WHERE image_url IS NOT NULL ORDER BY slug;",
        ],
        env={"PGPASSWORD": "vqrmVQLK5iEunWCcliSMrjyu"},
        text=True,
    )
    rows: list[tuple[str, str]] = []
    for line in out.strip().splitlines():
        if "|" not in line:
            continue
        slug, image_url = line.split("|", 1)
        rows.append((slug.strip(), image_url.strip()))
    return rows


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "autorental-restore/1.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        dest.write_bytes(resp.read())


def filename_from_url(image_url: str) -> str:
    return unquote(urlparse(image_url).path.rsplit("/", 1)[-1])


def main() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ok = fail = skip = 0

    for slug, image_url in load_cities():
        filename = filename_from_url(image_url)
        dest = UPLOAD_DIR / filename
        if dest.exists() and dest.stat().st_size > 0:
            skip += 1
            continue

        source = CITY_PHOTOS.get(slug)
        if not source:
            print(f"SKIP {slug}: no curated photo mapping")
            skip += 1
            continue

        try:
            download(source, dest)
            print(f"restored {slug} -> {filename}")
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"FAILED {slug}: HTTP {e.code}")
            fail += 1
        except Exception as e:  # noqa: BLE001
            print(f"FAILED {slug}: {e}")
            fail += 1

    print(f"done: restored={ok} skipped={skip} failed={fail}")


if __name__ == "__main__":
    main()
