import { requireAuth, sendErrors } from "@/app/api/wrapper";
import { setSource } from "@/lib/queries/video";
import { NextRequest } from "next/server";
import { APISetReuploadRequestBody, APISetReuploadResponseBody } from "@/lib/api/video";
import { fetch_metadata } from "@/lib/external";


async function handler(req: NextRequest) {
    const body: APISetReuploadRequestBody = await req.json()

    let r_fetch_result

    try {
        r_fetch_result = await fetch_metadata(body.reupload_link)
    } catch (e: any) {
        return new Response(e.message, { status: 404 })
    }

    if (body.original_link == null) {
        setSource(r_fetch_result.id, null)

        return Response.json({
            reupload_title: r_fetch_result.title,
            reupload_platform: r_fetch_result.platform
        } satisfies APISetReuploadResponseBody)
    }

    let o_fetch_result

    try {
        o_fetch_result = await fetch_metadata(body.original_link)
    } catch (e: any) {
        return new Response(e.message, { status: 404 })
    }

    if (o_fetch_result.source)
        return new Response('Setting reupload of reuploaded video is not allowed', { status: 400 })

    await setSource(r_fetch_result.id, o_fetch_result.id)

    return Response.json({
        reupload_title: r_fetch_result.title,
        reupload_platform: r_fetch_result.platform,
        original_title: o_fetch_result.title,
        original_platform: o_fetch_result.platform
    } satisfies APISetReuploadResponseBody)
}

export const POST = requireAuth(sendErrors(handler))
