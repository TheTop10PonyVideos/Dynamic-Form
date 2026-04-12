import { video_metadata } from "@/generated/prisma";
import { prisma } from "../prisma";
import { getVideoMetadata } from "./video";


export function getPlaylists(uid: string) {
    return prisma.playlist.findMany({
        where: { owner_id: uid },
        orderBy: { last_accessed: "desc" }
    })
}


export function getPlaylist(playlist_id: string) {
    return prisma.playlist.findUnique({
        where: { id: playlist_id },
        include: {
            playlist_item: {
                include: { video_metadata: true },
                orderBy: { id: "asc" }
            },
        },
    })
}

export function getPlaylistItem(item_id: number) {
    return prisma.playlist_item.findUnique({
        where: { id: item_id }
    })
}


export async function removePlaylistItem(uid: string, playlist_id: string, item_id: number, next_thumbnail?: string) {
    await prisma.playlist.update({
        where: { owner_id: uid, id: playlist_id },
        data: {
            playlist_item: {
                delete: { id: item_id }
            },
            ...(next_thumbnail && { thumbnail: next_thumbnail })
        }
    })
}


export function addPlaylistItem(uid: string, playlist_id: string, data: video_metadata) {
    return prisma.playlist.upsert({
        where: {
            id: playlist_id,
            owner_id: uid
        },
        update: {
            playlist_item: {
                create: { metadata_id: data.id }
            }
        },
        create: {
            id: playlist_id,
            owner_id: uid,
            thumbnail: data.thumbnail,
            playlist_item: {
                create: { metadata_id: data.id }
            }
        }
    })
}


export function editPlaylist(playlist_id: string, owner_id: string, name: string, description: string) {
    return prisma.playlist.update({
        where: { id: playlist_id, owner_id: owner_id },
        data: { name: name, description: description }
    })
}
