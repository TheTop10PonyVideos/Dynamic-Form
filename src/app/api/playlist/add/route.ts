import { fetch_metadata } from '@/lib/external'
import { addPlaylistItem } from "@/lib/queries/playlist"
import { getUser } from "@/lib/queries/user"
import { toClientVideoMetadata } from '@/lib/util'
import { NextRequest } from 'next/server'
import { APIAddPIRequestBody } from "@/lib/api/playlist"

// Route for adding items to regular playlists
export async function POST(req: NextRequest) {
  const body: APIAddPIRequestBody = await req.json()
  const uid = req.cookies.get("uid")?.value

  if (!body.link || !body.playlist_id)
    return new Response(null, { status: 400 })

  const fetch_result = await fetch_metadata(body.link)

  if ("type" in fetch_result)
    return Response.json({ error: fetch_result.details })

  if (!uid)
    return new Response()

  await getUser(uid, true)
  await addPlaylistItem(uid, body.playlist_id, fetch_result)

  return Response.json({metadata: toClientVideoMetadata(fetch_result) })
}
