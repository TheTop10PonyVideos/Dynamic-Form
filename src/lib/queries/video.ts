import { creator, Prisma, video_metadata, video_platform } from "@/generated/prisma";
import { prisma } from "../prisma";
import { BaseFetchResult } from "../types";


export async function getVideoMetadata(video_id: string, platform: video_platform, with_annotation: boolean) {
    return prisma.video_metadata.findUnique({
        where: {
            video_id_platform: { video_id, platform }
        },
        include: { 
            manual_label: with_annotation,
            // If the video is a reupload, return the original video's metadata
            video_metadata: {
                include: {
                    manual_label: with_annotation,
                    creator: true
                }
            },
            creator: true
        }
    })
}


export async function getNumVotes(id: bigint) {
    const result: any = await prisma.$queryRaw`SELECT get_video_votes(${id}) AS votes;`
    return result[0].votes;
}


export function saveMetadata(metadata: BaseFetchResult) {
    const { creator, ...videoMetadata } = metadata

    return prisma.video_metadata.upsert({
        where: {
            video_id_platform: { video_id: videoMetadata.video_id, platform: videoMetadata.platform }
        },
        create: {
            ...videoMetadata,
            creator: {
                connectOrCreate: {
                    where: { channel_id_platform: {
                        channel_id: creator.channel_id,
                        platform: creator.platform
                    }},
                    create: creator
                }
            }
        },
        update: {
            ...videoMetadata,
            creator: {
                connectOrCreate: {
                    where: { channel_id_platform: {
                        channel_id: creator.channel_id,
                        platform: creator.platform
                    }},
                    create: creator
                }
            }
        },
        include: { creator: true }
    })
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


export function titleSearchMetadata(query: string): Promise<{ video_metadata: video_metadata, creator: creator }[]> {
    return prisma.$queryRaw`
        SELECT *
        FROM video_search(${query});
    `
}
