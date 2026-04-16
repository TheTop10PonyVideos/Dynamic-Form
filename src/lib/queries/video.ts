import { Prisma, video_metadata } from "@/generated/prisma";
import { prisma } from "../prisma";
import { VideoPlatform, VideoStatusSettings } from "../types";
import { adjustDate } from "../util";


export async function getVideoMetadata(id: string, platform: VideoPlatform, with_annotation: boolean) {
    const metadata = await prisma.video_metadata.findUnique({
        where: {
            video_id_platform: {
                video_id: id,
                platform: platform
            }
        },
        include: { 
            manual_label: with_annotation,
            // If the video is a reupload, return the original video's metadata
            video_metadata: {
                include: {
                    manual_label: with_annotation
                }
            }
        }
    })

    if (metadata == null)
        return metadata

    adjustDate(metadata)
    if (metadata.video_metadata)
        adjustDate(metadata.video_metadata)

    return metadata
}


export async function saveVideoMetadata(video_data: Omit<video_metadata, 'id'>) {
    return await prisma.video_metadata.create({ data: video_data })
}


export async function annotateVideo(metadata_id: bigint, status: Exclude<VideoStatusSettings, "default" | "reupload">, annotation: string) {
    await prisma.video_metadata.update({
        where: { id: metadata_id },
        data: {
            manual_label: {
                upsert: {
                    create: {
                        label: status,
                        content: annotation
                    },
                    update: {
                        label: status,
                        content: annotation
                    }
                }
            }
        }
    })
}


export async function removeVideoAnnotation(metadata_id: bigint) {
    try {
        await prisma.video_metadata.update({
            where: { id: metadata_id },
            data: {
                manual_label: { delete: true }
            }
        })
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
            throw error
    }
}


export async function setSource(reupload_id: bigint, original_id: bigint | null) {
    await prisma.video_metadata.update({
        where: { id: reupload_id },
        data: { source: original_id }
    })
}


export async function updateWhitelist(metadata_id: bigint, whitelisted: boolean) {
    await prisma.video_metadata.update({
        where: { id: metadata_id },
        data: { whitelisted }
    })
}


export async function titleSearchMetadata(query: string, threshold = 0.6): Promise<video_metadata[]> {
    const results: (video_metadata & {sim: number})[] = await prisma.$queryRaw`
    WITH v AS (
        SELECT *, word_similarity(${query}, title) AS sim
        FROM video_metadata
        WHERE recent AND whitelisted
    )
    SELECT *
    FROM v
    WHERE sim > ${threshold}
    ORDER BY sim DESC
    LIMIT 3;
    `

    return results.map(res => { const {sim, ...metadata} = res; return metadata })
}
