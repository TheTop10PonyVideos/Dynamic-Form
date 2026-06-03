import { BallotEntryField, Flag, VideoDataClient } from "./types";
import { client_labels } from "./labels";
import { manual_label, video_metadata } from "@/generated/prisma";
import { getLabels } from "./data_cache";
import { getEligibleRange } from "./util";

/**
 * Server side checks of video metadata to determine eligibility. If a manual label flagis present, it will be the only one present unless include_all is true
 * @returns A list of flags for any that may apply to the video
 */
export async function video_check(video_metadata: video_metadata & { video_metadata?: video_metadata, manual_label: manual_label | null }, include_all = false): Promise<Flag[]> {
    if (video_metadata.video_metadata)
        return video_check(video_metadata.video_metadata as any)
    
    const syncedLabels = await getLabels()
    const flags: Flag[] = []

    const upload_date = video_metadata.upload_date
    const [earliest, latest] = getEligibleRange()

    if (upload_date >= earliest && upload_date <= latest) {
        const temp = new Date(upload_date)
        temp.setDate(temp.getDate() + (temp.getDate() < 10 ? 1 : -1))
        
        if (temp < earliest || temp > latest)
            flags.push(syncedLabels.edge_date)
    }
    else
        flags.push(syncedLabels.wrong_period)

    if (video_metadata.duration !== null) {
        if (video_metadata.duration < 30)
            flags.push(syncedLabels.too_short)
        else if (video_metadata.duration <= 45)
            flags.push(syncedLabels.maybe_too_short)
    }

    if (video_metadata.uploader === "LittleshyFiM")
        flags.push(syncedLabels.littleshy_vid)

    return video_metadata.manual_label ?
        [
            ...(include_all ? flags : []),
            {
                name: "Manual Check",
                type: video_metadata.manual_label.eligible ? "eligible" : "ineligible",
                details: video_metadata.manual_label.reason,
                trigger: "manual"
            } as Flag
        ] :
        flags
}

/**
 * Client side checks for ballot eligibility rules
 * @param entries ballot entries
 * @param cli_labels labels passed from server side rendering
 * @returns The number of unique creators found, eligible entries, and all entries with ballot flags included
 */
export function ballot_check(entries: BallotEntryField[], cli_labels: client_labels) {
    const uniqueVids = new Set<string>()
    const creatorCounts = new Map<string, number>()
    const entryCopies = entries.map(e => ({ ...e, flags: [...e.flags] })) // Shallow copy to avoid accumulating the same flags in entries

    for (const entry of entryCopies) {
        if (!entry.videoData)
            continue

        const entryData = (entry.videoData.video_metadata ? entry.videoData.video_metadata : entry.videoData) as any as VideoDataClient

        const creator_id = `${entryData.uploader}-${entryData.platform}`

        if (uniqueVids.has(entryData.link))
            entry.flags.push(cli_labels.duplicate_votes)
        else
            uniqueVids.add(entryData.link)

        // Don't count creators from ineligible votes since some otherwise eligible votes may be flagged
        if (entry.flags.some(f => f.type === "ineligible"))
            continue

        const newCount = (creatorCounts.get(entryData.uploader) || 0) + 1
        creatorCounts.set(creator_id, newCount)
    }

    for (const entry of entryCopies) {
        if (!entry.videoData)
            continue

        const entryData = (entry.videoData.video_metadata ? entry.videoData.video_metadata : entry.videoData) as any as VideoDataClient

        const creator_id = `${entryData.uploader}-${entryData.platform}`
        const instances = creatorCounts.get(creator_id)!

        if (instances > 2 || instances === 2 && creatorCounts.size < 5)
            entry.flags.push(cli_labels.no_simping)
    }

    return {
        uniqueCreators: creatorCounts.size,
        eligible: entryCopies.filter(entry => entry.input && !entry.flags.some(f => f.type === "ineligible")),
        checkedEntries: entryCopies
    }
}
