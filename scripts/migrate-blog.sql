CREATE TABLE IF NOT EXISTS blog_post (
  id text PRIMARY KEY,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL DEFAULT '',
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  meta_title text,
  meta_description text,
  focus_keyword text,
  author_name text DEFAULT 'Auto to Rental',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_post_slug_active_idx ON blog_post (slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS blog_post_status_idx ON blog_post (status) WHERE deleted_at IS NULL;
