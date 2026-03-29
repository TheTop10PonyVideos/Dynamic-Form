"use client";

import { VideoPoolItem, VideoStatusSettings } from "@/lib/types";
import { ChangeEventHandler, Dispatch, SetStateAction, useEffect, useState } from "react";
import styles from "../page.module.css"
import { getVideoLinkTemp } from "@/lib/util";
import { stampMap } from "@/lib/labels";
import Image from "next/image";
import { annotateVideo } from "@/lib/api/video";

function Settings({ videoItem, setSelectedVideo }: { videoItem: VideoPoolItem, setSelectedVideo: Dispatch<SetStateAction<VideoPoolItem | null>> }) {
  let manual_label = videoItem.flags.find(f => f.trigger === "manual")
  if (manual_label?.type === "disabled")
    manual_label = undefined

  const [status, setStatus] = useState(manual_label?.type || "default")
  const [whitelisted, setWhitelisted] = useState(videoItem.whitelisted)
  const [inputs, setInputs] = useState({ eligibility: manual_label?.details || "", source: videoItem.source })

  const inputType = status === "reupload" ? "source" : "eligibility"
  const hideKey = `${videoItem.platform} - ${videoItem.id}`

  const radioBtnChange: ChangeEventHandler<HTMLInputElement> = e => setStatus(e.target.value)

  const noteChange: ChangeEventHandler<HTMLTextAreaElement> = e => setInputs(
    { ...inputs, [inputType]: e.target.value }
  )

  const save = async () => {
    await annotateVideo(videoItem.id, videoItem.platform, status as VideoStatusSettings, inputs[inputType], whitelisted)
    setSelectedVideo(null)
  }

  const hide = () => {
    if (localStorage.getItem(hideKey))
      localStorage.removeItem(hideKey)
    else
      localStorage.setItem(hideKey, "hidden")

    setSelectedVideo(null)
  }

  const default_selected = status === "default"

  return (
    <div className={styles.overlay} onClick={e => {if (e.currentTarget === e.target) setSelectedVideo(null)}}>
      <div className={styles.ItemSettingsContainer}>
        <div className={styles.thumbnailTitle}>
          <img src={videoItem.thumbnail}
            alt="" fetchPriority="low" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          />
          <a href={getVideoLinkTemp(videoItem)} target="_blank" rel="noopener noreferrer">{videoItem.title}</a>
        </div>
        <p>
        </p>

        <div className={styles.overlayOptions}>
          <div>
            <input id="whitelist_btn" type="checkbox" checked={whitelisted} onChange={e => setWhitelisted(e.target.checked)}/>
            <label htmlFor="whitelist_btn">Whitelist</label>
          </div>
          <div>
            <input id="rbtn1" name="status" value="eligible" checked={status === "eligible"} type="radio" onChange={radioBtnChange}/>
            <label htmlFor="rbtn1">Eligible</label>
            <input id="rbtn2" name="status" value="default" checked={status === "default"} type="radio" onChange={radioBtnChange}/>
            <label htmlFor="rbtn2">Default</label>
            <input id="rbtn3" name="status" value="ineligible" checked={status === "ineligible"} type="radio" onChange={radioBtnChange}/>
            <label htmlFor="rbtn3">Ineligible</label>
            <input id="rbtn4" name="status" value="reupload" checked={status === "reupload"} type="radio" onChange={radioBtnChange}/>
            <label htmlFor="rbtn4">Reupload</label>
          </div>

          <textarea disabled={default_selected} onChange={noteChange} placeholder={
            status === "reupload" ?
              "Link to the original upload" :
            `Why is this video ${status}?`
          } value={
            default_selected ?
              videoItem.flags
                .filter(f => f.trigger !== "manual")
                .reduce((prev, cur) => prev + "- " + cur.details + "\n", "") ||
                "No issues found" :

            status === "reupload" ?
              inputs.source :
            inputs.eligibility
          }/>

          <div style={{display: "flex",gap: "20px"}}>
            <button onClick={hide}>{localStorage.getItem(hideKey) ? "Unhide" : "Hide"}</button>
            <button onClick={save}>Save</button>
            <button onClick={() => setSelectedVideo(null)}>Back</button>
          </div>
        </div>
      </div>
    </div>)
}

function VideoTile({ i, item, onClick }: { i: number, item: VideoPoolItem, onClick: (item: VideoPoolItem) => void }) {
  const refFlag =
    item.flags.find(f => f.trigger === "manual" && f.type !== "disabled") ||
    item.flags.find(f => f.type === "ineligible") ||
    item.flags.find(f => f.type === "maybe ineligible")

  const s = item.votes !== 1

  return (
  <div className={styles.video_tile} onClick={() => onClick(item)}>
    <img src={item.thumbnail}
      style={{width: "inherit", maxWidth: "inherit", display: "block"}}
      alt="" fetchPriority="low" loading="lazy" decoding="async" referrerPolicy="no-referrer"
    />
    <p className={styles.tile_details} style={{zIndex: 50 - i}}>
      <span style={{display: "flex", justifyContent: "space-between"}}>
        <b>{item.votes} vote{s && "s"}</b>
        {item.whitelisted && <span className={styles.indicator}>☑️</span>}
        {refFlag && <Image src={stampMap[refFlag.type].icon} alt="" width={18} height={18}/>}
      </span>
      {item.title}<br/><br/>

      <b>Uploader:</b><br/>
      {item.uploader}<br/><br/>

      <b>Upload Date:</b><br/>
      {item.upload_date}<br/><br/>

      <b>Platform:</b><br/>
      {item.platform}
    </p>
  </div>
  )
}

// Todo, a show hidden option, and clearing outdated keys from localstorage on first render
export default function VideoPoolTab() {
  const [pool, setPool] = useState<VideoPoolItem[]>([])
  const [selected, setSelected] = useState<VideoPoolItem | null>(null)

  useEffect(() => {
    fetch("/api/pool")
      .then(res => res.json())
      .then(p => { setPool(p) })
  }, [])

  const settings = (item: VideoPoolItem) => setSelected(item)
  const nonHidden = pool.filter(v => !localStorage.getItem(`${v.platform} - ${v.id}`))

  return (
    <>
    <div className={styles.pool}>
    {nonHidden.map((item, i) => (
      <VideoTile key={i} item={item} i={i} onClick={settings}/>
    ))}
    </div>
    {selected !== null && <Settings videoItem={selected} setSelectedVideo={setSelected}/>}
    </>
  )
}
