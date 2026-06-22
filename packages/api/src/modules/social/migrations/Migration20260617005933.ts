import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260617005933 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "auto_post_rule" ("id" text not null, "name" text not null, "enabled" boolean not null default true, "event" text check ("event" in ('product_created', 'product_updated')) not null default 'product_created', "account_ids" jsonb not null, "template" text not null, "filters" jsonb null, "delay_minutes" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "auto_post_rule_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_auto_post_rule_deleted_at" ON "auto_post_rule" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "social_account" ("id" text not null, "platform" text check ("platform" in ('facebook', 'instagram', 'twitter', 'linkedin', 'pinterest', 'tiktok', 'tumblr', 'discord', 'google_business')) not null, "name" text not null, "external_id" text null, "access_token" text not null, "refresh_token" text null, "token_expires_at" timestamptz null, "enabled" boolean not null default true, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "social_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_account_deleted_at" ON "social_account" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "social_post" ("id" text not null, "product_id" text null, "account_id" text not null, "platform" text check ("platform" in ('facebook', 'instagram', 'twitter', 'linkedin', 'pinterest', 'tiktok', 'tumblr', 'discord', 'google_business')) not null, "content" text not null, "media_urls" jsonb null, "status" text check ("status" in ('draft', 'scheduled', 'publishing', 'published', 'failed')) not null default 'draft', "scheduled_at" timestamptz null, "published_at" timestamptz null, "external_post_id" text null, "error" text null, "attempts" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "social_post_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_social_post_deleted_at" ON "social_post" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "auto_post_rule" cascade;`);

    this.addSql(`drop table if exists "social_account" cascade;`);

    this.addSql(`drop table if exists "social_post" cascade;`);
  }

}
