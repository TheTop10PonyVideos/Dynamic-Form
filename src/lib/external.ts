// Methods for extracting video metadata from external sources

import { spawn } from "child_process"
import { YTDLPItems, VideoDataClient, Annotation, BaseVideoMetadata, BaseFetchResult, FetchResult } from "./types"
import { getVideoMetadata, saveMetadata } from "./queries/video"
import { creator, manual_label, video_metadata, video_platform } from "@/generated/prisma"
import { getEligibleRange } from "./util"
import { constants, createWriteStream, openSync, WriteStream } from "fs"
import { annotations } from "./annotations"
import { after } from "next/server"

// Variants of youtube domains that might be used
const youtube_domains = ["m.youtube.com", "www.youtube.com", "youtube.com", "youtu.be"]

// Non youtube domains that are also supported
const accepted_domains = [
    "bilibili.com",
    "bsky.app",
    "dailymotion.com",
    "dai.ly",
    "instagram.com",
    "newgrounds.com",
    "odysee.com",
    "pony.tube",
    "thishorsie.rocks",
    "tiktok.com",
    "twitter.com",
    "vimeo.com",
    "x.com",
]

const site_names: Record<string, string> = {
    'x': 'Twitter',
    'bsky': 'Bluesky',
    'pony': 'PonyTube',
    'thishorsie': 'ThisHorsieRocks',
    'dai': 'Dailymotion'
}


/**
 * Given a non YouTube video URL, extracts the video id from it.
 * 
 * Non yotube videos seem to have their ids completely within the
 * url path, so it should be fine if that is used as the id in the db
 * until otherwise necessary. This resolves the issue of potential links
 * with multiple videos, such as https://x.com/_Maka_11/status/1790185560805683463/video/1
 * which contains a post id and an index
 */
function extract_ytdl_id(url: URL) {
    return url.pathname.replace(/^\/*|\/*$/, '')
}

/**
 * Given a YouTube video URL, extracts the video id from it.
 * 
 * Returns null if no id can be extracted.
 */
function extract_yt_id(url: URL) {
    // Parse the URL to retrieve the video id, which is the only parameter we
    // care about for the purpose of normalization. We currently recognize the
    // following types of YouTube URL, some of which have the video id in a
    // different place:
    //
    // Regular YouTube URL:      https://www.youtube.com/watch?v={VIDEO ID}
    // No-subdomain YouTube URL: https://youtube.com/watch?v={VIDEO ID}
    // Mobile YouTube URL:       https://m.youtube.com/watch?v={VIDEO ID}
    // Livestream URL:           https://www.youtube.com/live/{VIDEO ID}
    // Shortened URL:            https://youtu.be/{VIDEO ID}
    // Shorts URL                https://www.youtube.com/shorts/{VIDEO ID}

    const path = url.pathname.split("/")[1]
    let match: RegExpExecArray | null = null

    if (["watch", "live", "shorts"].includes(path)) {
        const part = url.pathname + url.search

        const patterns = [
            /^\/watch\/?\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/, // Regular YouTube URL: eg. https://www.youtube.com/watch?v=9RT4lfvVFhA
            /^\/shorts\/([a-zA-Z0-9_-]{11})/, // Shorts URL: eg. https://www.youtube.com/shorts/5uFeg2BOPNo
            /^\/live\/([a-zA-Z0-9_-]{11})/, // Livestream URL: eg. https://www.youtube.com/live/Q8k4UTf8jiI
        ]
        patterns.find(pattern => match = pattern.exec(part))
    }
    else {
        // Shortened YouTube URL: eg. https://youtu.be/9RT4lfvVFhA
        match = /^([a-zA-Z0-9_-]{11})/.exec(path)
    }

    return match?.[1]
}

function get_nonyt_site_name(url: URL) {
    const host = /\.?([^\.]+)\.[^\.]+$/.exec(url.hostname)![1]
    return site_names[host] ?? host[0].toUpperCase() + host.slice(1)
}

/**
 * Given an ISO 8601 duration string, return the length of that duration in seconds.
 */
function convert_iso8601_duration_to_seconds(iso8601_duration: string) {

    if (iso8601_duration.startsWith("PT"))
        iso8601_duration = iso8601_duration.slice(2)

    let total_seconds = 0, hours = 0, minutes = 0, seconds = 0

    if (iso8601_duration.includes("H")) {
        const [hours_part, remainder] = iso8601_duration.split("H")
        iso8601_duration = remainder
        hours = parseInt(hours_part)
    }

    if (iso8601_duration.includes("M")) {
        const [minutes_part, remainder] = iso8601_duration.split("M")
        iso8601_duration = remainder
        minutes = parseInt(minutes_part)
    }

    if (iso8601_duration.includes("S")) {
        const seconds_part = iso8601_duration.replace("S", "")
        seconds = parseInt(seconds_part)
    }

    total_seconds = hours * 3600 + minutes * 60 + seconds

    return total_seconds
}

/**
 * Returns false if the video is not an appropriate candidate for the search whitelist, and null otherwise to allow manual review
 */
const search_disqualify_check = (recent: boolean, duration: number | null, uploader: string) => (
    recent && (duration !== null ? duration >= 30 : true) && uploader != 'LittleshyFiM' ?
    false : null
)

async function ytdlp_fetch(url: string): Promise<YTDLPItems | { entries: YTDLPItems[] }> {
    return new Promise((resolve, reject) => {
        const cmd = spawn('yt-dlp', [
            '-q',
            '--no-download',
            '--dump-json',
            '--no-warnings',
            '--sleep-interval', '2',
            '--use-extractors',
                'BiliBili,Bluesky,dailymotion,Instagram,lbry,Newgrounds,PeerTube,TikTok,twitter,vimeo,generic',
            '--cookies', 'cookies.txt',
            url
        ])

        let response = ''
        let err = ''

        cmd.stdout.on('data', data => response += data.toString())
        cmd.stderr.on('data', data => err += data.toString())

        cmd.on('close', code => {
            if (code !== 0)
                return reject(new Error(err))

            try {
                resolve(JSON.parse(response))
            } catch {
                reject(new Error(`Failed to parse json: ${response}`))
            }
        })
    })
}

async function from_youtube(url: URL, with_annotation: boolean) {
    const video_id = extract_yt_id(url)

    if (!video_id)
        throw new Error('Invalid video link format')

    const cached = await getVideoMetadata(video_id, 'YouTube', with_annotation)

    if (cached)
        return cached

    const id_param = new URLSearchParams({ id: video_id })
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${id_param}&part=snippet,contentDetails&key=${process.env.API_KEY}`)
    const response_data = await response.json()
    const response_item = response_data["items"][0]

    if (!response_item)
        throw new Error('Video is not public or is unavailable')

    const snippet = response_item["snippet"]
    const
        upload_date = new Date(snippet["publishedAt"]),
        recent = upload_date >= getEligibleRange()[0],
        channel_name = snippet["channelTitle"],
        duration = convert_iso8601_duration_to_seconds(response_item["contentDetails"]["duration"])

    const ch_id_param = new URLSearchParams({ id: snippet["channelId"] })
    const ch_response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${ch_id_param}&part=snippet&key=${process.env.API_KEY}`)
    const ch_response_data = await ch_response.json()
    
    const ch_response_item = ch_response_data["items"][0]
    const ch_snippet = ch_response_item["snippet"]
    const pfp_url = ch_snippet['thumbnails']['default']['url']

    return {
        title: snippet["title"],
        video_id, recent, duration,
        thumbnail: snippet.thumbnails.medium.url,
        upload_date: upload_date,
        platform: 'YouTube',
        searchable: search_disqualify_check(recent, duration, channel_name),
        creator: {
            channel_name, pfp_url,
            platform: 'YouTube',
            channel_id: snippet["channelId"],
            last_updated: new Date(Date.now())
        },
    } satisfies BaseFetchResult
}

/**
 * Query yt-dlp for the given URL.
 */
async function from_other(url: URL, with_annotation: boolean) {
    let netloc = /([^.]+\.[^.]+)$/.exec(url.hostname)![1]

    if (!(accepted_domains.includes(netloc)))
        throw new Error(annotations.unsupported_site.details)

    const video_id = extract_ytdl_id(url)

    if (!video_id)
        throw new Error('Invalid video link format')

    const site = get_nonyt_site_name(url)

    const cached = await getVideoMetadata(video_id, site as video_platform, with_annotation)

    if (cached)
        return cached

    const url_str = url.toString()
    let response

    try {
        response = await ytdlp_fetch(url_str)

        if ("entries" in response)
            response = response["entries"][0]
    } catch (error) {
        console.log(error)
        throw new Error('Video is not public or is unavailable')
    }

    /* Some results might have missing or moved fields that
    are to be handled here before they can be used properly */
    switch (site) {
        case "Twitter":
            response["title"] = `"${response["title"].slice(response["uploader"].length + 3)}"` // unsliced format is: uploader - title
            /* This type of url means that the post has more than one video
            and ytdlp will only successfully retrieve the duration if
            the video is at index one */
            if (
                url_str.slice(0, url_str.lastIndexOf("/")).endsWith("/video") && // TODO revisit logic
                parseInt(url_str.slice(url_str.lastIndexOf("/") + 1)) != 1
            )
                response["duration"] = undefined
            break
        case "Odysee":
            response["uploader"] = response["channel"]
            break
        case "Tiktok":
            response["uploader"] = response["channel"]
            response["uploader_id"] = `@${response["uploader"]}`
            break
        case "Newgrounds":
            response["uploader_id"] = response["uploader"]
            break
    }

    const date_str: string = response["upload_date"]
    const
        upload_date = new Date(`${date_str.slice(0, 4)}-${date_str.slice(4, 6)}-${date_str.slice(6)}`),
        recent = upload_date >= getEligibleRange()[0],
        duration = response["duration"] || null,
        uploader = response["uploader"],
        platform = site.charAt(0).toUpperCase() + site.slice(1) as video_platform

    return {
        title: response['title'],
        video_id, recent, duration, platform,
        thumbnail: response['thumbnail'] || '',
        upload_date: upload_date,
        searchable: search_disqualify_check(recent, duration, uploader),
        creator: {
            channel_name: uploader,
            pfp_url: null, // TODO
            channel_id: response['uploader_id']!,
            last_updated: new Date(Date.now()),
            platform
        },
    } satisfies BaseFetchResult
}

/**
 * Given a video url, try fetching its metadata from the respective platform if supported
 * @param url_str a link to a video
 * @returns A video metadata object if the fetch was successful
 */
export async function fetch_metadata(url_str: string, with_annotation = false): Promise<FetchResult> {
    if (!url_str.startsWith("https://"))
        url_str = "https://" + url_str

    const url = new URL(url_str)
    const metadata = await (youtube_domains.includes(url.hostname) ? from_youtube(url, with_annotation) : from_other(url, with_annotation))
    
    if (!('id' in metadata))
        return { ...(await saveMetadata(metadata)), manual_label: null, video_metadata: null }

    return metadata
}


// Code for connecting to and sending videos to the discord bot

let writeStream: WriteStream | null = null

// Will mainly be caused by the reader closing under normal circumstances
function onPipeError(e: Error) {
    console.log('Disconnected from discord bot')
    writeStream = null
}

/**
 * Open the named pipe created by the discord bot process in order to send video search candidates
 */
export function connectPipe() {
    if (writeStream)
        return

    const fd = openSync('/tmp/horse_vid_candidates', constants.O_WRONLY | constants.O_NONBLOCK)
    writeStream = createWriteStream('', { fd })
    console.log('Connected to discord bot')
    writeStream.addListener('error', onPipeError)
}

/**
 * Sends a video search result candidate to the discord bot
 */
export function sendCandidateToBot(videoData: VideoDataClient & { annotations: Annotation[], video_id: string }) {
    if (writeStream)
        writeStream.write(JSON.stringify(videoData) + '\n')
}
