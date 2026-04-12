import { fetch_metadata } from '@/lib/external'
import { removeBallotItem, setBallotItem } from '@/lib/queries/ballot'
import { video_check } from '@/lib/vote_rules'
import { NextRequest } from 'next/server'
import { APIValidateRequestBody } from '@/lib/api/video'
import { toClientVideoMetadata } from '@/lib/util'

// Route for checking an entry in the ballot against the rules, and saving its position
export async function POST(req: NextRequest) {
  const body: APIValidateRequestBody = await req.json()
  
  if (!body.link || body.index && (body.index > 9 || body.index < 0))
    return new Response(null, { status: 400 })
  
  const uid = req.cookies.get("uid")?.value
  const fetch_result = await fetch_metadata(body.link, true)

  const [annotations, metadata] = "type" in fetch_result ? [[fetch_result], undefined] : [await video_check(fetch_result), fetch_result]

  if (body.index !== undefined && uid) {
    if (!metadata)
      removeBallotItem(uid, body.index!).catch()
    else
      await setBallotItem(uid, body.index!, metadata.id)
  }
  const all_data = (req.nextUrl.searchParams.get('all_data') || 'false').toLowerCase() === 'true'
  const return_data = metadata && toClientVideoMetadata(metadata, !all_data)

  return Response.json({ field_flags: annotations, video_data: return_data })
}
