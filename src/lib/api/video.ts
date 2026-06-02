import { Flag, VideoDataClient } from '@/lib/types';
import { label_key } from '../labels';


export type APIValidateRequestBody = {
    link: string
    index?: number
}

export type APIValidateResponseBody = {
    field_flags: Flag[]
    video_data?: VideoDataClient
    reupload_of?: string
}

/**
 * Check the eligibility of a video given its url and keep track of its entry position
 * @param link video url
 * @param index ballot index to save the link at. can be omitted for the server not to save the ballot entry
 * @returns An array of eligibility flags, and, if present, video metadata associated with the link
 */
export async function validate(link: string, index?: number): Promise<APIValidateResponseBody> {
    const body = { link, index } satisfies APIValidateRequestBody

    const res = await fetch('/api/ballot/validate', {
        method: 'POST',
        body: JSON.stringify(body),
        credentials: index === undefined ? 'omit' : 'same-origin'
    })

    return await res.json()
}


export type APILabelUpdateRequestBody = { label_updates: Record<label_key, Flag>} 
/**
 * Update the label details shown in ballot entries when videos have these labels
 * @param label_updates New label data to replace corresponding existing ones. Should never contain manual labels
 */
export async function updateLabels(label_updates: Record<label_key, Flag>) {
    const body = { label_updates } satisfies APILabelUpdateRequestBody

    const res = await fetch('/api/label_update', {
        method: 'POST',
        body: JSON.stringify(body)
    })

    return res
}


export type APIAnnotateVideoRequestBody = {
    link: string
    eligible?: boolean | null
    reason?: string
    searchable?: boolean
}

export type APIAnnotateVideoResponseBody = {
    video_id: string
    title: string
    platform: string
}

/**
 * Annotate a video to override its auto assigned eligibility status and notes that are shown to the voters. 
 * @param link The link to the video
 * @param eligibility A FlagStatus or 'default' to signal that tnhe manual label shouldn't be used
 * @param searchable Whether the video should appear in search results
 * @param reason The reason for the eligibility annotation or source url if status is 'alternative'
 */
export async function annotateVideo(link: string, eligibility: boolean | null, reason: string, searchable?: boolean): Promise<APIAnnotateVideoResponseBody> {
    const body = { link, eligible: eligibility, searchable, reason } satisfies APIAnnotateVideoRequestBody

    const res = await fetch('/api/pool/annotate_video', {
        method: 'POST',
        body: JSON.stringify(body)
    })

    return await res.json()
}


export type APIVideoSearchResponseBody = { search_results: VideoDataClient[] }

export async function videoSearch(query: string): Promise<APIVideoSearchResponseBody> {
    const res = await fetch(`/api/video/search?q=${encodeURIComponent(query)}`, { method: 'GET' })
    return await res.json()
}

export type APISetReuploadRequestBody = {
    reupload_link: string,
    original_link: string | null
}

export type APISetReuploadResponseBody = {
    reupload_title: string,
    reupload_platform: string
} | {
    reupload_title: string,
    reupload_platform: string,
    original_title: string,
    original_platform: string
}

export async function setReupload(reupload_link: string, original_link: string | null): Promise<APISetReuploadResponseBody> {
    const body = { reupload_link, original_link } satisfies APISetReuploadRequestBody

    const res = await fetch('/api/pool/is_reupload', {
        method: 'POST',
        body: JSON.stringify(body)
    })

    return await res.json()
}
