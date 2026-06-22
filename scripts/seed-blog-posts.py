#!/usr/bin/env python3
"""Seed blog_post table with the 7 live articles (metadata from autotorental.com)."""
import json, subprocess, re, psycopg2
from datetime import datetime, timezone

DB = "postgresql://autorental:vqrmVQLK5iEunWCcliSMrjyu@localhost:5432/autorental_db"

SLUGS = [
  "cheapest-car-rental-dubai-2026",
  "monthly-car-rental-dubai-guide",
  "rent-lamborghini-dubai-real-cost",
  "car-rental-vs-taxi-uber-dubai",
  "rent-car-dubai-tourist-guide",
  "best-suv-rental-desert-dubai",
  "long-term-car-rental-dubai-vs-leasing",
]

def fetch_meta(slug):
    html = subprocess.check_output(["curl", "-sL", f"https://autorental.com/blog/{slug}"], text=True)
    h1 = re.search(r"<h1[^>]*>([^<]+)", html)
    desc = re.search(r'name="description" content="([^"]+)"', html)
    title = h1.group(1).strip() if h1 else slug.replace("-", " ").title()
    meta = desc.group(1).replace("&#x27;", "'") if desc else ""
    return title, meta

def main():
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    now = datetime.now(timezone.utc)
    for i, slug in enumerate(SLUGS):
        cur.execute("SELECT id FROM blog_post WHERE slug=%s AND deleted_at IS NULL", (slug,))
        if cur.fetchone():
            print("skip", slug)
            continue
        title, meta = fetch_meta(slug)
        body = f"<p>{meta}</p>\n<p><em>يمكنك تعديل المحتوى الكامل من لوحة التحكم → المدونة.</em></p>"
        cur.execute(
            """INSERT INTO blog_post
            (id, slug, title, excerpt, body, status, published_at, meta_title, meta_description, author_name, sort_order, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,'published',%s,%s,%s,'Auto to Rental',%s,%s,%s)""",
            (
                f"blog_{slug[:24]}",
                slug,
                title,
                meta[:300] if meta else None,
                body,
                now,
                title,
                meta,
                i,
                now,
                now,
            ),
        )
        print("seeded", slug)
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
