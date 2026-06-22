import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518173411 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "city" drop constraint if exists "city_slug_unique";`);
    this.addSql(`create table if not exists "city" ("id" text not null, "country_code" text not null, "name" text not null, "name_ar" text null, "slug" text not null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "city_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_city_country_code" ON "city" ("country_code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_city_slug_unique" ON "city" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_city_deleted_at" ON "city" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "city" cascade;`);
  }

}
