import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const SECRET = process.env.REVALIDATION_SECRET || ""

// POST /api/revalidate
// Body: { secret, paths?: string[], tags?: string[] }
// Called by the API backend when a vendor updates their profile or vehicles.
// Only revalidates the specific pages — not the whole site.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!SECRET || body.secret !== SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const paths: string[] = Array.isArray(body.paths) ? body.paths : []
    const tags: string[] = Array.isArray(body.tags) ? body.tags : []
    for (const p of paths) {
      revalidatePath(p)
      console.log("[revalidate] path:", p)
    }
    for (const tag of tags) {
      revalidateTag(tag)
      console.log("[revalidate] tag:", tag)
    }
    return NextResponse.json({ ok: true, paths, tags })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
