import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518202243 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vehicle" drop constraint if exists "vehicle_status_check";`);

    this.addSql(`alter table if exists "vehicle" add column if not exists "rejection_reason" text check ("rejection_reason" in ('wrong_details', 'photos_unclear', 'wrong_price', 'missing_info', 'duplicate', 'inappropriate', 'spam', 'fake', 'other')) null, add column if not exists "rejection_note" text null, add column if not exists "approved_at" timestamptz null, add column if not exists "rejected_at" timestamptz null;`);
    this.addSql(`alter table if exists "vehicle" alter column "status" type text using ("status"::text);`);
    this.addSql(`alter table if exists "vehicle" alter column "status" set default 'pending_approval';`);
    this.addSql(`alter table if exists "vehicle" add constraint "vehicle_status_check" check("status" in ('draft', 'pending_approval', 'active', 'rejected', 'paused', 'sold'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vehicle" drop constraint if exists "vehicle_status_check";`);

    this.addSql(`alter table if exists "vehicle" drop column if exists "rejection_reason", drop column if exists "rejection_note", drop column if exists "approved_at", drop column if exists "rejected_at";`);

    this.addSql(`alter table if exists "vehicle" alter column "status" type text using ("status"::text);`);
    this.addSql(`alter table if exists "vehicle" alter column "status" set default 'draft';`);
    this.addSql(`alter table if exists "vehicle" add constraint "vehicle_status_check" check("status" in ('draft', 'active', 'paused', 'sold'));`);
  }

}
