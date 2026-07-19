import { creator, manual_label, video_metadata, video_platform } from "@/generated/prisma"
import { eligibilityType } from "./annotations"


export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type VideoDataClient = Omit<
    FetchResult, 'id' | 'source' | 'upload_date' | 'duration' | 'searchable' | 'recent' | 'video_id' | 'creator'
> & {
    link: string,
    creator: BaseCreatorMetadata
    video_metadata?: Omit<FetchResult, 'id' | 'source' | 'upload_date' | 'duration' | 'searchable' | 'recent' | 'video_id'> & { link: string }
}

export type VideoStatusSetting = "eligible" | "default" | "ineligible"

/**
 * Used for describing reasons for a videos eligibility
 */
export type Annotation = {
    name: string
    type: eligibilityType
    details: string
    trigger: string
}

export type BaseVideoMetadata = Omit<video_metadata, 'id' | 'creator_id' | 'source'>

export type BaseCreatorMetadata = Omit<creator, 'id' | 'alias_of'>

export type BaseFetchResult = BaseVideoMetadata & { creator: BaseCreatorMetadata }
export type FetchResult = video_metadata & {
    creator: creator,
    manual_label: manual_label | null,
    video_metadata: Omit<FetchResult, 'video_metadata'> | null
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
    flags: Annotation[]
    videoData: VideoDataClient | undefined | null
    input: string
}

export type CreatorDisplayData = {
    channelURL: string
    profileImgURL: string
    channelName: string
    latestActiveDate: Date
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
    flags: Annotation[],
    upload_date: string,
    platform: video_platform,
    source_link: string
}
