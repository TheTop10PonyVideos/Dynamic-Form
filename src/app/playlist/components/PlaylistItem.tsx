"use client"

import { useEffect, useRef, useState } from "react";
import styles from "../page.module.css";
import { VideoDataClient } from "@/lib/types";

interface Props {
  data: VideoDataClient
  onRemove?: (index: number) => void
  index: number
}

export default function PlaylistItem({ data, onRemove, index }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const optionsElement = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsElement.current && !optionsElement.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [])

  return (
    <div className={styles.playlistEntry}>
      <a href={data.link} className={styles.videoDisplay} target="_blank" rel="noopener noreferrer">
        <img src={data.thumbnail || ""} className={styles.entryThumbnail} width={160} height={90} alt="" fetchPriority="low" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
        <div className={styles.videoDetails}>
          <h3 className={styles.videoTitle}>{data.title}</h3>
          <p className={styles.creatorField}>{data.creator.channel_name}</p>
        </div>
      </a>
      <div ref={optionsElement}>
        {onRemove && <>
          <button className={styles.entryOptionsButton} onClick={() => setMenuOpen((open) => !open)}>⋮</button>
          {menuOpen && (
            <div className={styles.dropdown}>
              <button onClick={() => onRemove(index)}>Remove</button>
            </div>
          )}
        </>}
      </div>
    </div>
  )
}