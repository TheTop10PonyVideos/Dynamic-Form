import { prisma } from "../prisma";
import { getEligibleRange, getVotingPeriod } from "../util";


export async function getBallotItems(uid: string) {
    // Keep track of votes from after the previous voting week
    const cycle_cutoff_date = getEligibleRange()[0]
    cycle_cutoff_date.setDate(cycle_cutoff_date.getDate() + 8)
    cycle_cutoff_date.setUTCHours(0)

    const ballot_items = await prisma.ballot_item.findMany({
        where: {
            user_id: uid, voting_period: { equals: cycle_cutoff_date }
        },
        include: {
            video_metadata: {
                include: {
                    manual_label: true,
                    video_metadata: {
                        include: { manual_label: true }
                    }
                }
            }
        }
    })

    return ballot_items
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
