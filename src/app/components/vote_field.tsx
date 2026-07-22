import { BallotEntryField, VideoDataClient } from "@/lib/types";
import styles from "../page.module.css";
import Image from "next/image";
import { stampMap } from "@/lib/annotations";

interface Props {
  index: number
  fieldData: BallotEntryField
  searchResults?: VideoDataClient[]
  focused: boolean
  setFocus: (index: number) => void
  onChanged: (e: React.ChangeEvent<HTMLInputElement>, field_index: number) => void
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>, field_index: number) => void
  onEntryReplacement: (index: number, data: VideoDataClient) => void
}

export default function VoteField({ index, fieldData, searchResults, focused, onChanged, onPaste, onEntryReplacement, setFocus }: Props) {
  const refFlag =
    fieldData.flags.find(f => f.trigger === "Manual Review") ||
    fieldData.flags.find(f => f.type === "ineligible") ||
    fieldData.flags.find(f => f.type === "maybe ineligible")

  const reuploadSourceData = fieldData.videoData?.video_metadata;
  const showEligibility = fieldData.videoData || fieldData.input && !focused

  const containerColor = refFlag && !focused ? ' ' + {
    'ineligible': styles.ineligible,
    'maybe ineligible': styles.warn
  }[refFlag.type as string] : ''

  return <div style={{position: 'relative', zIndex: focused ? 1 : undefined}}>
    <div className={`${styles.field}${containerColor}`}>
      {
        fieldData.videoData &&
        <div className={styles.video_display}>
          <img src={fieldData.videoData.thumbnail || ""} width={160} height={90} alt="" fetchPriority="low" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
          {fieldData.videoData.title || ""}
          <div className={styles.video_origin}>By <b>{fieldData.videoData.creator.channel_name}</b> on <b>{fieldData.videoData.platform}</b></div>
        </div>
      }

      <div>
        <input
          type="text"
          name={"resp" + index}
          onChange={e => onChanged(e, index)}
          onPaste={e => onPaste(e, index)}
          value={fieldData.input}
          className={styles.input}
          placeholder="Your Vote"
          onFocus={() => setFocus(index)}
          onBlur={() => setFocus(-1)}
        />
        {
          reuploadSourceData &&
          <span className={styles.reuploadNotice} style={{position: 'relative'}}>
            <Image src={"info.svg"} alt="" width={15} height={15}/>
            <span className={styles.reuploadNote}>
              <span
                style={{width: 180, fontSize: 'smaller'}}
              >This video is a reupload. Consider using the</span>
              <span
                className={styles.useReuploadButton}
                style={{fontSize: 'small'}}
                onClick={() => onEntryReplacement(index, reuploadSourceData as any)}
              >Original URL</span>
            </span>
          </span>
        }
      </div>

      <div className={styles.eligibilityIcon}>{
        // Field data undefined -> waiting for response
        fieldData === undefined ? <div className={styles.loading_icon}/> :
        showEligibility && (
          refFlag ? (
            // Annotation -> use eligibility listed on it
            <>
              <Image src={stampMap[refFlag.type].icon} alt="" width={25} height={25} />
              <div className={styles.note}>
                <h3>
                  { `${refFlag.type.replace(/\b\w/g, c => c.toUpperCase())}${refFlag.trigger === "Manual Review" ? " (Manually Checked)" : ""}` }
                </h3>

                {
                  // Annotations of videos being eligible can have empty details. This prevents an empty bullet point in that case
                  refFlag.details &&
                  <ul>
                    {fieldData.flags.map((flag, i) => <li key={i}>{flag.details}</li>)}
                  </ul>
                }

              </div>
            </>
          ) :
          // No annotations -> eligible
          <>
            <Image src={"checkmark.svg"} alt="" width={25} height={25} />
            <div className={styles.note2}>No issues detected!</div>
          </>
        )
      }</div>

    </div>
    {searchResults &&
      <div className={styles.searchResultsShade}>
        <div className={styles.dropAnchor}>
          {
            searchResults.length ? searchResults.map((r, i) =>
              <div
                className={`${styles.droppable} ${styles.searchResultDisplay}`}
                key={i}
                // TODO: change back to onClick where onBlur doesn't prevent it from running
                onMouseDown={() => onEntryReplacement(index, r)}
              >
                <img src={r.thumbnail || ''} alt='' fetchPriority='low' loading='lazy' decoding='async' referrerPolicy='no-referrer'/>
                <div style={{margin: '0px 2px'}}>
                  {r.title.length > 38 ? r.title.slice(0, 35) + '...' : r.title}
                </div>
                <div className={styles.video_origin}><b>{
                  r.creator.channel_name.length > 20 ? r.creator.channel_name.slice(0, 18) + '...' : r.creator.channel_name
                }</b></div>
              </div>
            ) : <div style={{top: '140px', position: 'relative'}}><b>No results found</b></div>
          }
        </div>
      </div>
    }
  </div>
}
