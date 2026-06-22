import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518200649 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "body_type" add column if not exists "icon_url" text null;`);

    this.addSql(`alter table if exists "feature" add column if not exists "icon_url" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "body_type" drop column if exists "icon_url";`);

    this.addSql(`alter table if exists "feature" drop column if exists "icon_url";`);
  }

}
