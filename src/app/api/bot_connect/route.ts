import { NextRequest } from "next/server"
import { requireAuth } from "../wrapper"
import { connectPipe } from "@/lib/external"


async function handler(req: NextRequest) {
    connectPipe()
    return new Response()
}

export const POST = requireAuth(handler)
