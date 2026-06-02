import { Prisma, video_metadata } from "@/generated/prisma";
import { prisma } from "../prisma";
import { VideoPlatform } from "../types";
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


export async function annotateVideo(metadata_id: bigint, eligible: boolean, reason?: string) {
    await prisma.video_metadata.update({
        where: { id: metadata_id },
        data: {
            manual_label: {
                upsert: {
                    create: {
                        eligible,
                        reason
                    },
                    update: {
                        eligible,
                        reason
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


export async function updateSearchable(metadata_id: bigint, searchable: boolean) {
    await prisma.video_metadata.update({
        where: { id: metadata_id },
        data: { searchable }
    })
}


export async function titleSearchMetadata(query: string, threshold = 0.6): Promise<video_metadata[]> {
    return await prisma.$queryRaw`
        SELECT title_search_metadata(${query}, ${threshold});
    `
}
