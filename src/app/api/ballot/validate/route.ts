import { fetch_metadata, sendCandidateToBot } from '@/lib/external'
import { removeBallotItem, setBallotItem } from '@/lib/queries/ballot'
import { video_check } from '@/lib/vote_rules'
import { NextRequest } from 'next/server'
import { APIValidateRequestBody, APIValidateResponseBody } from '@/lib/api/video'
import { getVideoLinkTemp, toClientVideoMetadata } from '@/lib/util'
import { getNumVotes } from '@/lib/queries/video'
import { labels } from '@/lib/labels'
import { VideoDataClient } from '@/lib/types'

// Route for checking an entry in the ballot against the rules, and saving its position
export async function POST(req: NextRequest) {
  const body: APIValidateRequestBody = await req.json()

  if (!body.link || body.index && (body.index > 9 || body.index < 0))
    return new Response(null, { status: 400 })

  const uid = req.cookies.get("uid")?.value
  const fetch_result = await fetch_metadata(body.link, true)
  
  let [annotations, metadata] = 'type' in fetch_result ? [[fetch_result], undefined] : [video_check(fetch_result as any), fetch_result]

  const source = metadata && 'video_metadata' in metadata ? metadata.video_metadata : null
  let reupload_of

  if (source)
    reupload_of = getVideoLinkTemp(source)

  const sendAllData = (req.nextUrl.searchParams.get('all_data') || 'false').toLowerCase() === 'true'
  const returnData = metadata && toClientVideoMetadata(metadata, !sendAllData)
  const responseBody: APIValidateResponseBody = { field_flags: annotations, video_data: returnData, reupload_of }

  if (body.index !== undefined && uid) {
    if (!metadata)
      removeBallotItem(uid, body.index!)
    else {
      await setBallotItem(uid, body.index!, metadata.id)

      // If a non reviewed video gets two votes, send it to the bot to determine whether it should appear in search results
      if (
        metadata.searchable === null &&
        !annotations.includes(labels.too_old) &&
        await getNumVotes(metadata.id) >= 2
      ) {
        const restructured: any = { ...returnData as VideoDataClient, annotations: annotations }
        restructured['video_id'] = metadata.video_id

        sendCandidateToBot(restructured)
      }
    }
  }

  return Response.json(responseBody)
}
