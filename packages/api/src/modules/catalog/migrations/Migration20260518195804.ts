import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518195804 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "car_model" ("id" text not null, "brand_id" text not null, "name" text not null, "slug" text not null, "year_from" integer null, "year_to" integer null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "car_model_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_car_model_brand_id" ON "car_model" ("brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_car_model_deleted_at" ON "car_model" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "car_model" cascade;`);
  }

}
