import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518202047 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "report" ("id" text not null, "vehicle_id" text not null, "seller_id" text null, "reporter_name" text null, "reporter_email" text null, "reporter_phone" text null, "reason" text check ("reason" in ('wrong_info', 'price_wrong', 'sold_already', 'scam', 'duplicate', 'inappropriate', 'spam', 'fake_photos', 'stolen_vehicle', 'other')) not null, "description" text null, "status" text check ("status" in ('open', 'reviewing', 'resolved', 'dismissed')) not null default 'open', "admin_note" text null, "ip_address" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "report_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_report_vehicle_id" ON "report" ("vehicle_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_report_seller_id" ON "report" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_report_status" ON "report" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_report_deleted_at" ON "report" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "report" cascade;`);
  }

}
