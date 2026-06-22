import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260525201500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vehicle" add column if not exists "videos" jsonb null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vehicle" drop column if exists "videos";`)
  }
}
