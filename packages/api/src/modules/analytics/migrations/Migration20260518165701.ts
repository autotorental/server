import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518165701 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "contact_event" ("id" text not null, "product_id" text not null, "seller_id" text not null, "event_type" text check ("event_type" in ('call', 'whatsapp', 'webrtc', 'view')) not null, "ip_address" text null, "user_agent" text null, "referer" text null, "country_code" text null, "customer_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "contact_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_event_product_id" ON "contact_event" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_event_seller_id" ON "contact_event" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_event_event_type" ON "contact_event" ("event_type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_event_deleted_at" ON "contact_event" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "contact_event" cascade;`);
  }

}
