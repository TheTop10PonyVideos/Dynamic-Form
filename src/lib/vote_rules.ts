import { BallotEntryField, Annotation, VideoDataClient, BaseFetchResult, FetchResult } from "./types";
import { annotations } from "./annotations";
import { manual_label, video_metadata } from "@/generated/prisma";
import { getEligibleRange } from "./util";

/**
 * Server side checks of video metadata to determine eligibility. If a manual label flagis present, it will be the only one present unless include_all is true
 * @returns A list of flags for any that may apply to the video
 */
export function video_check(video_metadata: FetchResult): Annotation[] {
    if (video_metadata.video_metadata)
        return video_check(video_metadata.video_metadata as any)

    const flags: Annotation[] = []

    const upload_date = video_metadata.upload_date
    const [earliest, latest] = getEligibleRange()

    if (upload_date > latest)
        flags.push(annotations.too_new)
    else if (upload_date.toDateString() === latest.toDateString())
        flags.push(annotations.new_edge)
    else if (upload_date.toDateString() === earliest.toDateString())
        flags.push(annotations.old_edge)
    else if (upload_date < earliest)
        flags.push(annotations.too_old)

    if (video_metadata.duration !== null) {
        if (video_metadata.duration < 30)
            flags.push(annotations.too_short)
        else if (video_metadata.duration <= 45)
            flags.push(annotations.maybe_too_short)
    }

    if (video_metadata.creator.channel_name === "LittleshyFiM")
        flags.push(annotations.littleshy_vid)

    return video_metadata.manual_label ?
        [
            ...flags,
            {
                name: "Manual Check",
                type: video_metadata.manual_label.eligible ? "eligible" : "ineligible",
                details: video_metadata.manual_label.reason || "",
                trigger: "Manual Review"
            }
        ] :
        flags
}

const priorityLabels = [
    annotations.duplicate_votes,
    annotations.no_simping,
    annotations.too_new, annotations.new_edge,
    annotations.too_old, annotations.old_edge
].map(l => l.trigger)

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

        const creator_id = `${entryData.creator.channel_id}-${entryData.platform}`

        if (uniqueVids.has(entryData.link))
            entry.flags.push(annotations.duplicate_votes)
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

        const creator_id = `${entryData.creator.channel_id}-${entryData.platform}`
        const instances = creatorCounts.get(creator_id)!

        if (instances > 2)
            entry.flags.push(annotations.no_simping)

        const manualAnnotation = entry.flags.find(f => f.trigger === 'Manual Review')
        if (!manualAnnotation)
            continue

        // Ballot and date violations take priority over eligible manual annotations, and manual annotations should hide all automatic ones
        const priorityViolations = entry.flags.filter(f => priorityLabels.includes(f.trigger))

        if (priorityViolations.length) {
            manualAnnotation.details = `[Eligible] ${manualAnnotation.details}`
            manualAnnotation.type = priorityViolations[0].type
            manualAnnotation.trigger = 'Overridden Manual Review'
            entry.flags = [...priorityViolations, manualAnnotation]
        }
        else
            entry.flags = [manualAnnotation]
    }

    return entryCopies
}

export function isEligible(entry: BallotEntryField) {
    return entry.videoData && (entry.flags.some(f => f.type === 'eligible') || !entry.flags.some(f => f.type === 'ineligible'))
}
