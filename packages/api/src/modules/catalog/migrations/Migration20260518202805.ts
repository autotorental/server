import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518202805 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vehicle" add column if not exists "sale_daily_price" integer null, add column if not exists "sale_weekly_price" integer null, add column if not exists "sale_monthly_price" integer null, add column if not exists "discount_percent" integer null, add column if not exists "discount_label" text null, add column if not exists "discount_starts_at" timestamptz null, add column if not exists "discount_ends_at" timestamptz null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vehicle" drop column if exists "sale_daily_price", drop column if exists "sale_weekly_price", drop column if exists "sale_monthly_price", drop column if exists "discount_percent", drop column if exists "discount_label", drop column if exists "discount_starts_at", drop column if exists "discount_ends_at";`);
  }

}
