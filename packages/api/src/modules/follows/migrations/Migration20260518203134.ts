import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260518203134 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seller_follow" ("id" text not null, "seller_id" text not null, "follower_email" text null, "follower_phone" text null, "follower_name" text null, "follower_device_id" text null, "notify_email" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_follow_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_follow_seller_id" ON "seller_follow" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_follow_follower_email" ON "seller_follow" ("follower_email") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_follow_follower_device_id" ON "seller_follow" ("follower_device_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_follow_deleted_at" ON "seller_follow" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_follow" cascade;`);
  }

}
