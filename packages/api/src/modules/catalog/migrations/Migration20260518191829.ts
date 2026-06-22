import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518191829 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "feature" drop constraint if exists "feature_slug_unique";`);
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_slug_unique";`);
    this.addSql(`alter table if exists "body_type" drop constraint if exists "body_type_slug_unique";`);
    this.addSql(`create table if not exists "body_type" ("id" text not null, "name" text not null, "name_ar" text null, "slug" text not null, "icon" text null, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "body_type_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_body_type_slug_unique" ON "body_type" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_body_type_deleted_at" ON "body_type" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "brand" ("id" text not null, "name" text not null, "slug" text not null, "logo_url" text null, "origin_country" text null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_name" ON "brand" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_slug_unique" ON "brand" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" ON "brand" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "feature" ("id" text not null, "name" text not null, "name_ar" text null, "slug" text not null, "category" text null, "icon" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "feature_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_feature_slug_unique" ON "feature" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feature_deleted_at" ON "feature" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "body_type" cascade;`);

    this.addSql(`drop table if exists "brand" cascade;`);

    this.addSql(`drop table if exists "feature" cascade;`);
  }

}
