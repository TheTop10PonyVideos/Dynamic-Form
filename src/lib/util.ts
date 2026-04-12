// A random assortent of helper functions that are needed in multiple areas of the project

import { video_metadata } from "@/generated/prisma";
import { Flag, VideoDataClient, VideoPlatform } from "./types";
import { client_labels, labels } from "./labels";

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
    return `https://${platform_bases[data.platform as VideoPlatform].replace("_id_", data.id).replace("_uid_", data.uploader_id)}`
}
*/

const platform_bases_temp = {
    "YouTube": "www.youtube.com/watch?v=",
    "Bilibili": "www.bilibili.com/",
    "Bluesky": "bsky.app/profile/",
    "Dailymotion": "www.dailymotion.com/",
    "Instagram": "www.instagram.com/",
    "Newgrounds": "www.newgrounds.com/",
    "Odysee": "odysee.com/",
    "PonyTube": "pony.tube/",
    "ThisHorsieRocks": "pt.thishorsie.rocks/",
    "Tiktok": "www.tiktok.com/",
    "Twitter": "x.com/",
    "Vimeo": "vimeo.com/"
}

export function getVideoLinkTemp(data: { platform: string, video_id: string, uploader_id: string }) {
    return `https://${platform_bases_temp[data.platform as VideoPlatform]}${data.video_id}`
}

/**
 * Truncates and transforms video metadata to only what the client needs
 */
export function toClientVideoMetadata(video_metadata: video_metadata, strip_data = true): VideoDataClient {
    const clientReceivable = strip_data ? (({ whitelisted, duration, upload_date, recent, video_id, id, ...stripped }) => stripped)(video_metadata) : video_metadata
    const withLink = { ...clientReceivable, link: getVideoLinkTemp(video_metadata) }
    return withLink
}

const validLink = /(https?:\/\/)?(\w+\.)?(pony\.tube|youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|thishorsie\.rocks|dailymotion\.com|dai\.ly|tiktok\.com|twitter\.com|x\.com|odysee\.com|newgrounds\.com|bsky\.app|instagram\.com)\/?[^\s]{0,500}/
const link = /(https?:\/\/)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+/

/**
 * Tests an input string to determine if it is a valid link
 * @returns false if input doesn't resemble a link, or an array of 0 or 1 flag if the link is or isn't from a supported platform respectively
 */
export function testLink(input: string): false | Flag[] {
    input = input.trim()
    if (!input) return false

    if (validLink.test(input)) return []
    if (link.test(input)) return [labels.unsupported_site]
    return false
}

/**
 * Same as testLink, except that labels passed from server side rendering are used instead
 */
export function cliTestLink(input: string, cli_labels: client_labels): false | Flag[] {
    input = input.trim()
    if (!input) return false

    if (validLink.test(input)) return []
    if (link.test(input)) return [cli_labels.unsupported_site]
    return false
}

/**
 * Get the index of the current voting cycle month
 * and whether or not the mane voting form is open
 */
export function getVotingPeriod(): [number, boolean] {
    const now = new Date(Date.now())
    const day = now.getDate()

    const period = new Date(
        now.getFullYear(),
        day > 7 ? now.getMonth() : now.getMonth() - 1,
        Math.min(day, 10) // Mar 30 to february would otherwise still result in march bc of day rollover
    )

    // The form is open if it's the first week or usually last day of the month
    now.setDate(day + 1) // Using rollover to determine if it's last day
    const formOpen = day <= 7 || day > now.getDate()

    return [period.getMonth(), formOpen]
}

/**
 * Get the earliest and latest dates from which videos
 * may be eligible to vote for, which include the last
 * day of the month prior to the voting period, and the
 * first day from the next month, since some exceptions
 * are made because of timezone differences
 */
export function getEligibleRange(): [Date, Date] {
    const now = new Date(Date.now())
    const periodMonth = getVotingPeriod()[0]

    return [
        new Date(
            now.getFullYear(),
            now.getMonth() != periodMonth ? now.getMonth() - 1 : now.getMonth(),
            0
        ),
        new Date(
            now.getFullYear(),
            now.getMonth() != periodMonth ? now.getMonth() : now.getMonth() + 1,
            1
        )
    ]
}

/**
 * Date objects use local timezones which may show different dates from those stored in the database.
 * This function is just to correct the misrepresentation of upload_date for wherever it's used
 */
export function adjustDate(v: video_metadata) {
    v.upload_date = new Date(
        v.upload_date.getUTCFullYear(),
        v.upload_date.getUTCMonth(),
        v.upload_date.getUTCDate()
    )
}
