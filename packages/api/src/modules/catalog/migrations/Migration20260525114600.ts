import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260525114600 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "feature_category" (
      "id" text not null,
      "key" text not null,
      "label" text not null,
      "sort_order" integer not null default 0,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "feature_category_pkey" primary key ("id")
    );`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_feature_category_key_unique" ON "feature_category" ("key") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feature_category_deleted_at" ON "feature_category" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "feature_category" cascade;`)
  }
}
