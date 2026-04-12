import { requireAuth, sendErrors } from "@/app/api/wrapper";
import { resetSource, setSource } from "@/lib/queries/video";
import { NextRequest } from "next/server";
import { APISetReuploadRequestBody, APISetReuploadResponseBody } from "@/lib/api/video";
import { get_video_keys } from "@/lib/external";
import { VideoPlatform } from "@/lib/types";


async function handler(req: NextRequest) {
    const body: APISetReuploadRequestBody = await req.json()
    let r_site_name: VideoPlatform | string, r_id: string | null
    let o_site_name: VideoPlatform | string, o_id: string | null

    try {
        const target = new URL(body.reupload_link);
        ({ site_name: r_site_name, video_id: r_id } = get_video_keys(target))

        if (!r_id)
            throw new Error()

        if (body.original_link != null) {
            const reupload_of = new URL(body.original_link);
            ({ site_name: o_site_name, video_id: o_id } = get_video_keys(reupload_of))

            if (!o_id)
                throw new Error()
        }
    }
    catch {
        return new Response('Malformed link or unsupported platform', { status: 400 })
    }

    if (body.original_link == null) {
        const metadata = await resetSource(r_id, r_site_name as VideoPlatform)

        if (!metadata)
            return new Response('No video data was previously recorded for this link', { status: 404 })

        return Response.json({
            reupload_title: metadata!.title,
            reupload_platform: metadata!.platform
        } satisfies APISetReuploadResponseBody)
    }

    const [r_metadta, o_metadta] = await setSource(r_id, r_site_name as VideoPlatform, o_id!, o_site_name! as VideoPlatform)

    if (!o_metadta)
        return new Response('No video data was previously recorded for one or both links', { status: 404 })

    return Response.json({
        reupload_title: r_metadta!.title,
        reupload_platform: r_metadta!.platform,
        original_title: o_metadta.title,
        original_platform: o_metadta.platform
    } satisfies APISetReuploadResponseBody)
}

export const POST = requireAuth(sendErrors(handler))
