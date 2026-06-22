import { createRequire } from "module"
import pg from "pg"

const require = createRequire(import.meta.url)
require("dotenv").config({ path: "/opt/autorental/packages/api/.env" })

const { Client } = pg

async function linkSellerAuthIdentity(client, authIdentityId, sellerId, memberId) {
  await client.query(
    `UPDATE auth_identity SET app_metadata = $1 WHERE id = $2`,
    [JSON.stringify({ seller_id: sellerId, member_id: memberId }), authIdentityId]
  )
  await client.query(
    `UPDATE provider_identity SET entity_id = $1 WHERE auth_identity_id = $2 AND provider = 'emailpass'`,
    [memberId, authIdentityId]
  )
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const { rows } = await client.query(`
    SELECT s.id AS seller_id, sm.member_id, m.email, pi.auth_identity_id
    FROM seller s
    JOIN seller_member sm ON sm.seller_id = s.id
    JOIN member m ON m.id = sm.member_id
    LEFT JOIN provider_identity pi ON pi.provider = 'emailpass'
      AND (LOWER(pi.entity_id) = LOWER(m.email) OR pi.entity_id = sm.member_id)
    WHERE sm.is_owner = true OR sm.role_id = 'role_seller_administration'
  `)

  let updated = 0
  for (const row of rows) {
    if (!row.auth_identity_id) continue
    await linkSellerAuthIdentity(client, row.auth_identity_id, row.seller_id, row.member_id)
    updated += 1
    console.log(`linked ${row.email} -> ${row.seller_id}`)
  }

  console.log(`Done. Updated ${updated} seller auth links.`)
  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
