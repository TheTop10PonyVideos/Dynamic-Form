import { NextRequest } from "next/server";

/**
 * Wrapper for endpoint handlers that should only allow the operator to use them.
 * Any unauthorized requests that go through this function will receive an empty 403 response.
 */
export function requireAuth(handler: (req: NextRequest) => Promise<Response>) {
    return function (req: NextRequest) {
        const uid = req.cookies.get("uid")?.value
    
        if (!uid || uid !== process.env.OPERATOR)
            return new Response(null, { status: 403 })

        return handler(req)
    }
}

export function sendErrors(handler: (req: NextRequest) => Promise<Response>) {
    return async function (req: NextRequest) {    
        try {
            return await handler(req)
        }
        catch (error) {
            return new Response(String(error), { status: 500 })
        }
    }
}
