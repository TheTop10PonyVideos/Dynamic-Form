import { requireAuth, sendErrors } from "@/app/api/wrapper";
import { annotateVideo as annotateVideo, removeVideoAnnotation, updateSearchable } from "@/lib/queries/video";
import { NextRequest } from "next/server";
import { APIAnnotateVideoRequestBody, APIAnnotateVideoResponseBody } from "@/lib/api/video";
import { fetch_metadata } from "@/lib/external";


async function handler(req: NextRequest) {
    const body: APIAnnotateVideoRequestBody = await req.json()
    body.reason = body.reason?.trim() || undefined

    const fetch_result = await fetch_metadata(body.link, false)

    if ('type' in fetch_result)
        return new Response(fetch_result.details, { status: 404 })

    if (!body.eligible && !body.reason)
        return new Response('Ineligible annotations must come with a reason', { status: 400 })

    const actions: Promise<any>[] = []

    if (body.searchable !== undefined)
        actions.push(updateSearchable(fetch_result.id, body.searchable))

    if (body.eligible === null)
        actions.push(removeVideoAnnotation(fetch_result.id))
    else if (body.eligible !== undefined)
        actions.push(annotateVideo(fetch_result.id, body.eligible, body.reason))

    await Promise.all(actions)

    return Response.json({ platform: fetch_result.platform, video_id: fetch_result.video_id, title: fetch_result.title } satisfies APIAnnotateVideoResponseBody)
}

export const POST = requireAuth(sendErrors(handler))
