import { APIVideoSearchResponseBody } from "@/lib/api/video";
import { titleSearchMetadata } from "@/lib/queries/video";
import { toClientVideoMetadata } from "@/lib/util";
import { NextRequest } from "next/server";

// Route for getting whitelisted videos that users can search by title for in the ballot
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")

  if (!query)
    return new Response(null, { status: 400 })

  const results = (
    await titleSearchMetadata(query)
  ).map(m => toClientVideoMetadata(m as any))

  return Response.json({
    search_results: results
  } satisfies APIVideoSearchResponseBody)
}
