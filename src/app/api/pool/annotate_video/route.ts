import { requireAuth, sendErrors } from "@/app/api/wrapper";
import { annotateVideo as annotateVideo, getVideoMetadata, removeVideoAnnotation, updateWhitelist } from "@/lib/queries/video";
import { NextRequest } from "next/server";
import { APIAnnotateVideoRequestBody, APIAnnotateVideoResponseBody } from "@/lib/api/video";
import { fetch_metadata } from "@/lib/external";


async function handler(req: NextRequest) {
    const body: APIAnnotateVideoRequestBody = await req.json()

    if (body.eligibility && !['eligible', 'default', 'ineligible'].includes(body.eligibility))
        return new Response('Invalid eligibility', { status: 400 })

    const fetch_result = await fetch_metadata(body.link, false)

    if ('type' in fetch_result)
        return new Response(fetch_result.details, { status: 404 })

    if (
        ((!body.eligibility || body.eligibility === 'default') && body.reason) ||
        (!body.reason && body.eligibility !== undefined && body.eligibility !== 'default')
    )
        return new Response('Incompatible annotation and status pair', { status: 400 })

    const actions: Promise<any>[] = []

    if (body.whitelisted !== undefined)
        actions.push(updateWhitelist(fetch_result.id, body.whitelisted!))

    if (body.eligibility === 'default')
        actions.push(removeVideoAnnotation(fetch_result.id))
    else if (body.eligibility)
        actions.push(annotateVideo(fetch_result.id, body.eligibility as 'eligible' | 'ineligible', body.reason!))

    await Promise.all(actions)

    return Response.json({ platform: fetch_result.platform, video_id: fetch_result.video_id, title: fetch_result.title } satisfies APIAnnotateVideoResponseBody)
}

export const POST = requireAuth(sendErrors(handler))
