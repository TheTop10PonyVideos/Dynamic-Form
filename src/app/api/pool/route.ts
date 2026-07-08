import { video_check } from "@/lib/vote_rules";
import { requireAuth } from "../wrapper";
import { getPool } from "@/lib/queries/etc";

async function handler() {
    const pool = await getPool()
    const withChecks = pool.map(v => ({
        ...v,
        flags: video_check(v, true),
        upload_date: v.upload_date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }))
    return Response.json(withChecks)
}

export const GET = requireAuth(handler)
