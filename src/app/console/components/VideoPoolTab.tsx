"use client";

import { VideoPoolItem, VideoStatusSetting } from "@/lib/types";
import { ChangeEventHandler, Dispatch, SetStateAction, useEffect, useState } from "react";
import styles from "../page.module.css"
import { getVideoLinkTemp } from "@/lib/util";
import { stampMap } from "@/lib/annotations";
import Image from "next/image";
import { annotateVideo, setReupload } from "@/lib/api/video";

function Settings({ videoItem, setSelectedVideo }: { videoItem: VideoPoolItem, setSelectedVideo: Dispatch<SetStateAction<VideoPoolItem | null>> }) {
  let manual_label = videoItem.flags.find(f => f.trigger === "Manual Review")

  const [status, setStatus] = useState(manual_label?.type || "default")
  const [searchable, setSearchable] = useState(videoItem.searchable)
  const [inputs, setInputs] = useState({ eligibility: manual_label?.details || "", source: videoItem.source_link })

  const inputType = status === "reupload" ? "source" : "eligibility"
  const hideKey = `${videoItem.platform} - ${videoItem.id}`

  const radioBtnChange: ChangeEventHandler<HTMLInputElement> = e => setStatus(e.target.value)

  const noteChange: ChangeEventHandler<HTMLTextAreaElement> = e => setInputs(
    { ...inputs, [inputType]: e.target.value.trim() }
  )

  const save = async () => {
    const link = getVideoLinkTemp(videoItem)

    if (inputType === 'source')
      await setReupload(link, inputs['source'])
    else {
      if (searchable !== null)
        await annotateVideo(
          link,
          { eligible: true, ineligible: false, default: null }[status]!,
          inputs['eligibility'],
          searchable || undefined
        )
    }

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
            <input id="set_searchable_btn" type="checkbox" checked={!!searchable} onChange={e => setSearchable(e.target.checked)}/>
            <label htmlFor="set_searchable_btn">Show in search results</label>
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
                .filter(f => f.trigger !== "Manual Review")
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
    item.flags.find(f => f.trigger === "Manual Review") ||
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
        {item.searchable && <span className={styles.indicator}>☑️</span>}
        {refFlag && <Image src={stampMap[refFlag.type].icon} alt="" width={18} height={18}/>}
      </span>
      {item.title}<br/><br/>

      {/*<b>Uploader:</b><br/>
      {item.uploader}<br/><br/>*/}

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
