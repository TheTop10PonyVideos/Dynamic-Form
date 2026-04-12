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
            manual_label: with_annotation
        }
    })

    if (metadata == null)
        return metadata

    adjustDate(metadata)
    return metadata
}


export async function saveVideoMetadata(video_data: Omit<video_metadata, 'id'>) {
    return await prisma.video_metadata.create({ data: video_data })
}


export async function annotateVideo(video_id: string, platform: VideoPlatform, status: Exclude<VideoStatusSettings, "default" | "reupload">, annotation: string) {
    await prisma.video_metadata.update({
        where: {
            video_id_platform: { video_id, platform }
        },
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


export async function removeVideoAnnotation(video_id: string, platform: VideoPlatform) {
    try {
        await prisma.video_metadata.update({
            where: {
                video_id_platform: { video_id, platform }
            },
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


export async function setSource(reupload_id: string, reupload_platform: VideoPlatform, original_id: string, original_platform: VideoPlatform) {
    const original_metadta = await getVideoMetadata(original_id, original_platform, false)

    if (!original_metadta)
        return [null, null]

    try {
        const reupload_metadata = await prisma.video_metadata.update({
            where: { video_id_platform: { video_id: reupload_id, platform: reupload_platform } },
            data: { source: original_metadta.id }
        })

        return [original_metadta, reupload_metadata]
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
            return [original_metadta, null]

        throw error
    }
}


export async function resetSource(target_id: string, target_platform: VideoPlatform) {
    try {
        return await prisma.video_metadata.update({
            where: { video_id_platform: { video_id: target_id, platform: target_platform } },
            data: { source: null }
        })
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
            return null

        throw error
    }
}


export async function updateWhitelist(video_id: string, platform: VideoPlatform, whitelisted: boolean) {
    return prisma.video_metadata.update({
        where: {
            video_id_platform: { video_id, platform }
        },
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
