import { requireAuth, sendErrors } from "@/app/api/wrapper";
import { annotateVideo as annotateVideo, removeVideoAnnotation, updateWhitelist } from "@/lib/queries/video";
import { NextRequest } from "next/server";
import { APIAnnotateVideoRequestBody } from "@/lib/api/video";
import { get_video_keys } from "@/lib/external";
import { VideoPlatform } from "@/lib/types";


async function handler(req: NextRequest) {
    const body: APIAnnotateVideoRequestBody = await req.json()
    let site_name: VideoPlatform | string
    let video_id: string | null

    if (body.eligibility && !['eligible', 'default', 'ineligible'].includes(body.eligibility))
        return new Response('Invalid status', { status: 400 })

    try {
        ({ site_name, video_id } = get_video_keys(new URL(body.link)))
        if (!video_id) throw new Error()
    }
    catch {
        return new Response('Malformed link or unsupported platform', { status: 400 })
    }

    if (
        ((!body.eligibility || body.eligibility === 'default') && body.reason) ||
        (!body.reason && body.eligibility !== undefined && body.eligibility !== 'default')
    )
        return new Response('Incompatible annotation and status pair', { status: 400 })

    const actions = []

    if (body.whitelisted !== undefined)
        actions.push(() => updateWhitelist(video_id, site_name as VideoPlatform, body.whitelisted!))

    if (body.eligibility === 'default')
        actions.push(() => removeVideoAnnotation(video_id, site_name as VideoPlatform))
    else if (body.eligibility)
        actions.push(() => annotateVideo(video_id, site_name as VideoPlatform, body.eligibility as 'eligible' | 'ineligible', body.reason!))

    await Promise.all(actions)

    return new Response()
}

export const POST = requireAuth(sendErrors(handler))
