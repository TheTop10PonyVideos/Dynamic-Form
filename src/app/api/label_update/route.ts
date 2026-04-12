import { APILabelUpdateRequestBody } from "@/lib/api/video";
import { setLabelConfigs } from "@/lib/queries/etc";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { requireAuth } from "../wrapper";

// Update label configs in the running server instance and in the db
async function handler(req: NextRequest) {
    const body: APILabelUpdateRequestBody = await req.json()

    await setLabelConfigs(Object.values(body.label_updates))
    revalidateTag("labels", "max")

    return new Response()
}

export const POST = requireAuth(handler)
