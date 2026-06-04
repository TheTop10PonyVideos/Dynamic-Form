import { BallotEntryField, Flag, VideoDataClient } from "./types";
import { labels } from "./labels";
import { manual_label, video_metadata } from "@/generated/prisma";
import { getEligibleRange } from "./util";

/**
 * Server side checks of video metadata to determine eligibility. If a manual label flagis present, it will be the only one present unless include_all is true
 * @returns A list of flags for any that may apply to the video
 */
export async function video_check(video_metadata: video_metadata & { video_metadata?: video_metadata, manual_label: manual_label | null }, include_all = false): Promise<Flag[]> {
    if (video_metadata.video_metadata)
        return video_check(video_metadata.video_metadata as any)
    
    const flags: Flag[] = []

    const upload_date = video_metadata.upload_date
    const [earliest, latest] = getEligibleRange()

    if (upload_date >= earliest && upload_date <= latest) {
        const temp = new Date(upload_date)
        temp.setDate(temp.getDate() + (temp.getDate() < 10 ? 1 : -1))
        
        if (temp < earliest || temp > latest)
            flags.push(labels.edge_date)
    }
    else
        flags.push(labels.wrong_period)

    if (video_metadata.duration !== null) {
        if (video_metadata.duration < 30)
            flags.push(labels.too_short)
        else if (video_metadata.duration <= 45)
            flags.push(labels.maybe_too_short)
    }

    if (video_metadata.uploader === "LittleshyFiM")
        flags.push(labels.littleshy_vid)

    return video_metadata.manual_label ?
        [
            ...(include_all ? flags : []),
            {
                name: "Manual Check",
                type: video_metadata.manual_label.eligible ? "eligible" : "ineligible",
                details: video_metadata.manual_label.reason || "",
                trigger: "Manual Review"
            }
        ] :
        flags
}

const ballotViolations = [
    labels.duplicate_votes,
    labels.no_simping
]

/**
 * Client side checks for ballot eligibility rules
 * @param entries ballot entries
 * @returns The number of unique creators found, eligible entries, and all entries with ballot flags included
 */
export function ballot_check(entries: BallotEntryField[]) {
    const uniqueVids = new Set<string>()
    const creatorCounts = new Map<string, number>()
    // Copy so that the original entries won't be modified
    const entryCopies = entries.map(e => ({ ...e, flags: e.flags.map(f => ({ ...f })) }))

    for (const entry of entryCopies) {
        if (!entry.videoData)
            continue

        const entryData = (entry.videoData.video_metadata ? entry.videoData.video_metadata : entry.videoData)

        const creator_id = `${entryData.uploader}-${entryData.platform}`

        if (uniqueVids.has(entryData.link))
            entry.flags.push(labels.duplicate_votes)
        else
            uniqueVids.add(entryData.link)

        // Don't count creators from ineligible votes since some otherwise eligible votes may be flagged
        if (entry.flags.some(f => f.type === "ineligible"))
            continue

        const newCount = (creatorCounts.get(creator_id) || 0) + 1
        creatorCounts.set(creator_id, newCount)
    }

    for (const entry of entryCopies) {
        if (!entry.videoData)
            continue

        const entryData = (entry.videoData.video_metadata ? entry.videoData.video_metadata : entry.videoData)

        const creator_id = `${entryData.uploader}-${entryData.platform}`
        const instances = creatorCounts.get(creator_id)!

        if (instances > 2)
            entry.flags.push(labels.no_simping)

        const manualAnnotation = entry.flags.find(f => f.trigger === 'Manual Review')
        if (!manualAnnotation)
            continue

        // Ballot violations take priority over eligible manual annotations, and manual annotations should hide all automatic ones
        const entryViolations = entry.flags.filter(f => ballotViolations.includes(f))

        if (entryViolations.length) {
            manualAnnotation.details = `[Eligible] ${manualAnnotation.details}`
            manualAnnotation.type = 'ineligible'
            manualAnnotation.trigger = 'Overridden Manual Review'
            entry.flags = [...entryViolations, manualAnnotation]
        }
        else
            entry.flags = [manualAnnotation]
    }

    return entryCopies
}

export function isEligible(entry: BallotEntryField) {
    return entry.videoData && (entry.flags.some(f => f.type === 'eligible') || !entry.flags.some(f => f.type === 'ineligible'))
}
