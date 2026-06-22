import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518201323 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "vehicle" ("id" text not null, "seller_id" text not null, "brand_id" text not null, "model_id" text null, "body_type_id" text null, "city_id" text not null, "title" text not null, "description" text null, "year" integer null, "mileage_km" integer null, "color" text null, "fuel_type" text check ("fuel_type" in ('petrol', 'diesel', 'electric', 'hybrid', 'plugin_hybrid', 'other')) null, "transmission" text check ("transmission" in ('automatic', 'manual', 'cvt', 'semi_automatic')) null, "seats" integer null, "doors" integer null, "currency_code" text not null default 'aed', "daily_price" integer null, "weekly_price" integer null, "monthly_price" integer null, "phone_number" text null, "whatsapp_number" text null, "livekit_enabled" boolean not null default false, "photos" jsonb null, "feature_ids" jsonb null, "status" text check ("status" in ('draft', 'active', 'paused', 'sold')) not null default 'draft', "is_featured" boolean not null default false, "view_count" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vehicle_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_seller_id" ON "vehicle" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_brand_id" ON "vehicle" ("brand_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_model_id" ON "vehicle" ("model_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_body_type_id" ON "vehicle" ("body_type_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_city_id" ON "vehicle" ("city_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_status" ON "vehicle" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_deleted_at" ON "vehicle" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vehicle" cascade;`);
  }

}
