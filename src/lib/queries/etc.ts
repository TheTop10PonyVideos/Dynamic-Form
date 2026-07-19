import { prisma } from "../prisma";
import { BaseCreatorMetadata } from "../types";


export async function getAllData() {
    const [
        users, video_metadata, ballot_item, playlist, playlist_item, manual_label
    ] = await Promise.all([
        prisma.user.findMany(),
        prisma.video_metadata.findMany(),
        prisma.ballot_item.findMany(),
        prisma.playlist.findMany(),
        prisma.playlist_item.findMany(),
        prisma.manual_label.findMany()
    ])

    return { users, video_metadata, ballot_item, manual_label, playlist, playlist_item }
}


export async function getPool() {
    return (
        await prisma.video_metadata.findMany({
            include: {
                manual_label: true,
                _count: { select: { ballot_item: true } },
                creator: true,
                video_metadata: {
                    include: {
                        manual_label: true,
                        creator: true
                    }
                }
            },
            orderBy: { ballot_item: { _count: "desc" } },
            take: 45
        })
    ).map(v => {
        return {
            ...v,
            votes: v._count.ballot_item
        }
    })
}


export function getRecentCreators(): Promise<Omit<BaseCreatorMetadata, 'last_updated'>[]> {
    return prisma.$queryRaw`
        SELECT *
        FROM get_recent_creators();
    `
}
