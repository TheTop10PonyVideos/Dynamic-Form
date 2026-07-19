import { prisma } from "../prisma";
import { getVotingPeriod } from "../util";


export function getBallotItems(uid: string) {
    return prisma.ballot_item.findMany({
        where: {
            user_id: uid, voting_period: { equals: getVotingPeriod() }
        },
        include: {
            video_metadata: {
                include: {
                    manual_label: true,
                    video_metadata: {
                        include: { manual_label: true, creator: true }
                    },
                    creator: true
                }
            }
        }
    })
}


export async function removeBallotItem(uid: string, index: number) {
    await prisma.ballot_item.delete({
        where: { user_id_index: { user_id: uid, index } }
    })
}


export async function setBallotItem(uid: string, index: number, metadata_id: bigint) {
    const item = {
        metadata_id,
        index,
        creation_date: new Date(Date.now()),
        voting_period: getVotingPeriod()
    }

    await prisma.user.upsert({
        where: { id: uid },
        update: {
            ballot_item: {
                upsert: {
                    where: { user_id_index: { user_id: uid, index: index } },
                    update: item,
                    create: { ...item }
                }
            }
        },
        create: {
            id: uid,
            ballot_item: {
                create: item
            }
        }
    })
}
