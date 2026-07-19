import { fetch_metadata, sendCandidateToBot } from '@/lib/external'
import { removeBallotItem, setBallotItem } from '@/lib/queries/ballot'
import { video_check } from '@/lib/vote_rules'
import { after, NextRequest } from 'next/server'
import { APIValidateRequestBody, APIValidateResponseBody } from '@/lib/api/video'
import { getVideoLinkTemp, toClientVideoMetadata } from '@/lib/util'
import { getNumVotes } from '@/lib/queries/video'
import { annotations } from '@/lib/annotations'

// Route for checking an entry in the ballot against the rules, and saving its position
export async function POST(req: NextRequest) {
  const body: APIValidateRequestBody = await req.json()

  if (!body.link || body.index && (body.index > 9 || body.index < 0))
    return new Response(null, { status: 400 })

  const uid = req.cookies.get("uid")?.value
  let metadata

  try {
    metadata = await fetch_metadata(body.link, true)
  } catch (e: any) {
    if (body.index !== undefined && uid)
      removeBallotItem(uid, body.index!)

    return Response.json({
      field_flags: [{ name: 'Fetch error', trigger: 'fetch error', details: e.message, type: 'ineligible'}],
    } satisfies APIValidateResponseBody)
  }

  let check_results = video_check(metadata)

  const source = metadata.video_metadata
  let reupload_of

  if (source)
    reupload_of = getVideoLinkTemp(source)

  const sendAllData = (req.nextUrl.searchParams.get('all_data') || 'false').toLowerCase() === 'true'
  const returnData = toClientVideoMetadata(metadata, !sendAllData)
  const responseBody: APIValidateResponseBody = { field_flags: check_results, video_data: returnData, reupload_of }

  if (body.index !== undefined && uid) {      
    await setBallotItem(uid, body.index!, metadata.id)

    // If a non reviewed video gets two votes, send it to the bot to determine whether it should appear in search results
    after(async () => {
      if (
        metadata.searchable === null &&
        !check_results.includes(annotations.too_old) &&
        await getNumVotes(metadata.id) >= 2
      ) {
        const restructured: any = { ...returnData, annotations: check_results }
        restructured['video_id'] = metadata.video_id

        sendCandidateToBot(restructured)
      }
    })
  }

  return Response.json(responseBody)
}
