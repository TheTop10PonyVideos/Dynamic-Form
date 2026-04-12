// Verbatim

import { video_metadata } from "@/generated/prisma"
import { flagTypes } from "./labels"

export type VideoPlatform =
    "YouTube" |
    "Bilibili" |
    "Bluesky" |
    "Dailymotion" |
    "Instagram" |
    "Newgrounds" |
    "Odysee" |
    "PonyTube" |
    "Tiktok" |
    "ThisHorsieRocks" |
    "Twitter" |
    "Vimeo"

export const VideoPlatforms = [
    "YouTube",
    "Bilibili",
    "Bluesky",
    "Dailymotion",
    "Instagram",
    "Newgrounds",
    "Odysee",
    "PonyTube",
    "Tiktok",
    "ThisHorsieRocks",
    "Twitter",
    "Vimeo"
]

export type VideoDataClient = Omit<video_metadata, "upload_date" | "duration" | "whitelisted" | "recent" | "video_id" | "id"> & { link: string }

export type VideoStatusSettings = "eligible" | "default" | "ineligible"

/**
 * Used to signify a videos eligibility status
 * 
 * The context these flags are used in determine what their values can be assumed to be
 */
export type Flag = {
    name: string
    type: flagTypes
    details: string
    trigger: string
}

/**
 * The data used in a ballot entry field
 * 
 * flags determines the apparent video eligibility with details shown by hovering over the icon
 * 
 * videoData is what's used to show video details in the field.
 * undefined here is used to mean that data is in the process being
 * retrieved, while null is used to mean that there is none
 * 
 * input is the user input string, ideally of a video url
 */
export type BallotEntryField = {
    flags: Flag[]
    videoData: VideoDataClient | undefined | null
    input: string
}

export type YTDLPItems = {
    channel: string
    thumbnail: string
    upload_date: string
    title: string
    id: string
    uploader: string
    uploader_id: string | undefined
    duration: number | undefined
}

export type VideoPoolItem = Omit<video_metadata, "upload_date" | "platform"> & {
    votes: number,
    flags: Flag[],
    upload_date: string,
    platform: VideoPlatform,
    source_link: string
}
