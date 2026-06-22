export async function upsertAppSetting(
  pg: any,
  key: string,
  value: string,
  isSecret = true
): Promise<void> {
  const now = new Date()
  const existing = await pg("app_setting").where({ key }).first()
  if (existing) {
    await pg("app_setting").where({ key }).update({ value, is_secret: !!isSecret, updated_at: now })
    return
  }
  await pg("app_setting").insert({
    key,
    value,
    is_secret: !!isSecret,
    created_at: now,
    updated_at: now,
  })
}
