// A random assortent of helper functions that are needed in multiple areas of the project

import { creator, manual_label, video_metadata, video_platform } from "@/generated/prisma";
import { Annotation, BaseFetchResult, FetchResult, Optional, VideoDataClient } from "./types";
import { annotations } from "./annotations";

/*const platform_bases = {
    "YouTube": "www.youtube.com/watch?v=_id_",
    "Dailymotion": "www.dailymotion.com/video/_id_",
    "Vimeo": "vimeo.com/_id_",
    "ThisHorsieRocks": "pt.thishorsie.rocks/w/_id_",
    "PonyTube": "pony.tube/w/_id_",
    "Bilibili": "www.bilibili.com/video/_id_",
    "Twitter": "x.com/_uid_/status/_id_",
    "Bluesky": "bsky.app/profile/_uid_/post/_id_",
    "Tiktok": "www.tiktok.com/_uid_/video/_id_",
    "Odysee": "odysee.com/_uid_/_id_",
    "Newgrounds": "www.newgrounds.com/portal/view/_id_"
}

/**
 * Reconstructs a video link from a videos metadata
 * @param data An object containing the platform, id, and uploader id of a video,
 * which are the maximum needed to reconstruct any link from the supported platforms
 * @returns The reconstructed link
 * /
export function getVideoLink(data: { platform: string, id: string, uploader_id: string }) {
    return `https://${platform_bases[data.platform as video_platform].replace("_id_", data.id).replace("_uid_", data.uploader_id)}`
}
*/

const platform_bases_temp: Record<video_platform, string> = {
    "YouTube": "www.youtube.com/watch?v=",
    "Bilibili": "www.bilibili.com/",
    "Bluesky": "bsky.app/profile/",
    "Dailymotion": "www.dailymotion.com/",
    "Derpibooru": "derpibooru.org/",
    "Instagram": "www.instagram.com/",
    "Newgrounds": "www.newgrounds.com/",
    "Odysee": "odysee.com/",
    "PonyTube": "pony.tube/",
    "ThisHorsieRocks": "pt.thishorsie.rocks/",
    "Tiktok": "www.tiktok.com/",
    "Twitter": "x.com/",
    "Vimeo": "vimeo.com/"
}

export function getVideoLinkTemp(data: { platform: video_platform, video_id: string }) {
    return `https://${platform_bases_temp[data.platform]}${data.video_id}`
}

/**
 * Truncates and transforms video metadata to only what the client needs
*/
export function toClientVideoMetadata(videoMetadata: Optional<FetchResult, 'manual_label' | 'video_metadata'>, strip_data = true): VideoDataClient {
    const clientReceivable = { ...videoMetadata }

    for (const unserializable of ['id', 'source', 'creator_id', 'alias_of']) {
        delete (clientReceivable.creator as any)[unserializable]
        delete (clientReceivable as any)[unserializable]
    }

    if (strip_data)
        for (const to_strip of ['searchable', 'duration', 'upload_date', 'recent'])
            delete (clientReceivable as any)[to_strip]

    if (clientReceivable.manual_label)
        delete (clientReceivable.manual_label as any)['metadata_id']

    if (clientReceivable.video_metadata)
        clientReceivable.video_metadata = toClientVideoMetadata(clientReceivable.video_metadata as FetchResult, strip_data) as any

    const withLink = { ...clientReceivable, link: getVideoLinkTemp(clientReceivable) }

    return withLink as any // shhhh
}

const validLink = /(https?:\/\/)?(\w+\.)?(pony\.tube|youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|thishorsie\.rocks|dailymotion\.com|dai\.ly|derpibooru\.org|tiktok\.com|twitter\.com|x\.com|odysee\.com|newgrounds\.com|bsky\.app|instagram\.com)\/?[^\s]{0,500}/
const link = /(https?:\/\/)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+/

/**
 * Tests an input string to determine if it is a valid link
 * @returns false if input doesn't resemble a link, or an array of 0 or 1 flag if the link is or isn't from a supported platform respectively
 */
export function testLink(input: string): false | Annotation[] {
    input = input.trim()
    if (!input) return false

    if (validLink.test(input)) return []
    if (link.test(input)) return [annotations.unsupported_site]
    return false
}

/*
 * Check whether or not the mane voting form is currently open
 */
export function isFormOpen() {
    const date = new Date(Date.now())
    date.setUTCDate(date.getUTCDate() + 1) // Using rollover to determine if this is the last day of the month
    
    // The form is open if it's the first week or usually the last day of the month
    return date.getUTCDate() <= 8
}

/**
 * Get the year and month of the current voting period as a Date
 */
export function getVotingPeriod() {
    const now = new Date()
    const day = now.getUTCDate()

    return new Date(Date.UTC(
        now.getUTCFullYear(),
        day > 7 ? now.getUTCMonth() : now.getUTCMonth() - 1,
        1
    ))
}

/**
 * Get the earliest and latest datetimes from which videos
 * may be eligible to vote for, which account for the first
 * day of the month at the earliest timezone, and the last
 * day of the month from the latest, since some exceptions
 * are made because of timezone differences
 */
export function getEligibleRange(): [Date, Date] {
    const period = getVotingPeriod()

    const [earliest, latest] = [new Date(period), new Date(period)]

    earliest.setUTCHours(-14)
    latest.setUTCMonth(period.getUTCMonth() + 1)
    latest.setUTCHours(12)

    return [earliest, latest]
}
