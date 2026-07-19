"use client"

import { useRef, useState } from "react";
import { redirect, RedirectType } from "next/navigation";
import styles from "../page.module.css";
import { BallotEntryField, CreatorDisplayData, VideoDataClient } from "@/lib/types";
import VoteCounter from "./vote_counter";
import VoteField from "./vote_field";
import { testLink } from "@/lib/util";
import { removeBallotItem } from "@/lib/api/ballot";
import { validate, videoSearch } from "@/lib/api/video";
import { ballot_check, isEligible } from "@/lib/vote_rules";
import Image from "next/image";
import { annotations } from "@/lib/annotations";
import CreatorTicker from "./creator_ticker";

interface Props {
  votingPeriod: Date,
  formOpen: boolean,
  initialEntries: BallotEntryField[]
  recentCreators: CreatorDisplayData[]
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function VoteForm({ votingPeriod, formOpen, initialEntries, recentCreators }: Props) {
  const [voteFields, setVoteFields] = useState<BallotEntryField[]>(initialEntries)
  const [warning, setWarning] = useState(false)
  const [searchResults, setSearchResults] = useState<[number, VideoDataClient[]]>([-1, []])
  const [focusIndex, setFocusIndex] = useState(-1)
  const inputTimeouts = useRef<NodeJS.Timeout[]>([])
  const deletionTimeouts = useRef<NodeJS.Timeout[]>([])
  const pasting = useRef(false)

  /**
   * Shorthand for updating vote fields given their index
   */
  const updateField = (index: number, newFieldVals: Partial<BallotEntryField>) => {
    setVoteFields(prevFields => {
      const updated = [...prevFields]
      updated[index] = { ...updated[index], ...newFieldVals }
      return updated
    })
  }

  /**
   * Rerender the page using the results of the validation request
   * @param input user input, ideally a well formed link from a supported domain
   * @param field_index used by the server to save the entry's position
   */
  const applyValidation = async (input: string, field_index: number) => {
    const { field_flags, video_data } = await validate(input, field_index)
    updateField(field_index, { flags: field_flags, videoData: video_data || null })
  }

  /**
   * Tell the server to forget the entry at the specified index
   */
  const removeFieldSave = (field_index: number) => {
    // Assume already not present whien there's no video data
    if (!voteFields[field_index].videoData)
      return

    // Wait until the user stops editing the entry field to avoid spamming requests
    clearTimeout(inputTimeouts.current[field_index])
    clearTimeout(deletionTimeouts.current[field_index])

    deletionTimeouts.current[field_index] = setTimeout(() => {
      removeBallotItem(field_index)
    }, 1000)
  }

  const search = async (field_index: number, query: string) => {
    const res = await videoSearch(query)
    setSearchResults([field_index, res.search_results])
  }

  const setFocus = (field_index: number) => {
    setSearchResults([-1, []])
    setFocusIndex(field_index)
  }

  const replaceFieldEntry = async (field_index: number, new_video: VideoDataClient) => {
    // Making a call to validate to get flags and save the vote
    setSearchResults([-1, []])
    const field_flags = (await validate(new_video.link, field_index)).field_flags
    updateField(field_index, { flags: field_flags, videoData: new_video, input: new_video.link })
  }

  // Handler for changes to the ballot entry fields
  const changed = async (e: React.ChangeEvent<HTMLInputElement>, field_index: number) => {    
    const input = e.currentTarget.value.trim()
    const isLink = testLink(input)

    clearTimeout(inputTimeouts.current[field_index])

    if (!input) {
      updateField(field_index, { input, videoData: null, flags: [] })
      removeFieldSave(field_index)
    }
    else if (!isLink) {
      updateField(field_index, { input: e.currentTarget.value, videoData: null, flags: [annotations.invalid_link] })
      removeFieldSave(field_index)
      if (input.length >= 2)
        inputTimeouts.current[field_index] = setTimeout(() => search(field_index, input), 500)
      else
        setSearchResults([-1, []])
    }
    else if (isLink.length) {
      updateField(field_index, { input, videoData: null, flags: isLink })
      removeFieldSave(field_index)
    }
    else if (pasting.current) {
      pasting.current = false
      updateField(field_index, { input, videoData: undefined })
      clearTimeout(deletionTimeouts.current[field_index])
      applyValidation(input, field_index)
    }
    else {
      updateField(field_index, { input, videoData: undefined })
      clearTimeout(deletionTimeouts.current[field_index])
      inputTimeouts.current[field_index] = setTimeout(() => applyValidation(input, field_index), 2500)
    }
  }

  // Assuming this would normally be a link, prevent changed() from delaying requests
  const pasted = () => { pasting.current = true }

  // Exports votes to the main form, and shows a warning if there's a chance that < 5 might be ineligible
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formOpen)
      return

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement

    if (submitter.value === "warn")
      return setWarning(true)

    let responses = voteFields.map(f => f.input.trim()).filter(vote => vote != "")
    responses = [...responses, ...Array(10 - responses.length).fill("")]

    const base = "https://docs.google.com/forms/d/e/1FAIpQLSdVi1gUmI8c2nBnYde7ysN8ZJ79EwI5WSBTbHKqIgC7js0PYg/viewform?usp=pp_url&"
    const params = [
      "entry.1539722665=",
      "entry.762566163=",
      "entry.1505751621=",
      "entry.1836454367=",
      "entry.111008931=",
      "entry.1232436476=",
      "entry.345333698=",
      "entry.543465209=",
      "entry.289193595=",
      "entry.578807278=",
    ]

    redirect(`${base}${params.map((key, i) => {
      let url = responses[i]
      if (!url) return key

      url = encodeURIComponent(`${url}${url.split("/").at(-1)!.includes("?") ? "&f=1" : "?f=1"}`) // todo: edge case
      return `${key}${url}`
    }).join("&")}`, RedirectType.push)
  }

  // Ballot rules are checked in the client, here
  const checkedEntries = ballot_check(voteFields)
  const eligibleCount = checkedEntries.filter(isEligible).length

  return (
    <>
      <VoteCounter eligibleCount={eligibleCount}/>
      <form className={styles.form} onSubmit={submit} autoComplete="off">
        { warning && submitSub5Overlay(eligibleCount, () => setWarning(false)) }
        <div className={styles.headerfield}>
          <label>Voting for The Top 10 Pony Videos of {months[votingPeriod.getUTCMonth()]}</label>
          <p>
            This form is made to make voting easier by displaying video details with each vote and by checking their preliminary eligibility in advance.<br/><br/>
            To submit your votes, click the <b>Export Votes</b> button at the bottom. This will forward all your votes to the <a className={styles.link} href="https://docs.google.com/forms/d/e/1FAIpQLSdVi1gUmI8c2nBnYde7ysN8ZJ79EwI5WSBTbHKqIgC7js0PYg/viewform">main Google Form</a> where you can then submit them.<br/><br/>
            Note: Most of the checks are automatic, so be sure the videos&apos; content also align with the rules.<br/><br/>
            Symbol Meanings:<br/>
            ✅ = No issues detected<br/>
            ⚠️ = Maybe ineligible<br/>
            ❌ = Ineligible<br/><br/>
            If you aren&apos;t familiar with the rules or need any reminder, be sure to carefully read the full rules <a href="https://www.thetop10ponyvideos.com/voting-info#h.j2voxvq0owh8" className={styles.link}>here</a>.
          </p>
        </div>
        <CreatorTicker displayData={recentCreators}/>
        {checkedEntries.map((fieldData, i) =>
          <VoteField
            key={i}
            index={i}
            fieldData={fieldData}
            focused={i == focusIndex}
            searchResults={searchResults[0] == i ? searchResults[1] : undefined}
            onChanged={changed}
            onPaste={pasted}
            onEntryReplacement={replaceFieldEntry}
            setFocus={setFocus}
          />
        )}
        <div className={styles.field}>
          <label>Contact Email, or Discord name, or Twitter, or Mastodon</label>
          <div style={{margin: '0 15px'}}>
            Feel free to leave this blank, however, <b>including consistent contact info every time you vote helps us to recognize regular voters!</b>&nbsp; It also makes it possible to contact voters if there&apos;s an issue or question. <i>More information and privacy policy can be found here: <a href="https://www.thetop10ponyvideos.com/links-info-credits/privacy-policy">https://www.thetop10ponyvideos.com/links-info-credits/privacy-policy</a></i>
          </div>
          <div className={styles.input} style={{ color: "grey", fontSize: 14, pointerEvents: "none" }}>For privacy reasons, only enter contact info on the official form</div>
        </div>
        <button type="submit" value={eligibleCount < 5 ? "warn" : "export" } className={`${styles.exportButton} ${formOpen ? (eligibleCount ? styles.submitButton : styles.disabledSubmitButton2) : styles.disabledSubmitButton}`}>
          Export Votes
          <div className={styles.disabledExportNote}>
            Come back during the first week of {months[(votingPeriod.getUTCMonth() + 1) % 12]} when the voting form opens!
          </div>
        </button>
      </form>
    </>
  )
}

function submitSub5Overlay(votes: number, reset: () => void) {
  return (
    <div className={styles.mask}>
      <div className={styles.warning_prompt}>
        <span style={
          {
            display: 'flex',
            fontSize: '1.4rem',
            gap: '8px',
            alignItems: 'center'
          }
        }>✨ <b>New</b> <Image src='/sunbeam.gif' width={35} height={35} alt='' unoptimized />
        </span>
        <span>It seems your ballot may have fewer than 5 eligible votes</span>
        <span>That's okay! A new weighted system was implemented to allow this</span>
        <span>You can read how it works <a href='https://www.thetop10ponyvideos.com/faqs#h.p9y6ton9fwz' style={{ pointerEvents: 'all' }} target='_blank'>here</a></span>
        <span>Consider including at least <b>5</b> eligible votes, as each would then have a full weight</span>
        <span>Current vote weight: <b>{votes / 5}</b> out of <b>1</b></span>
        <div>
          <button type="submit" value="export" className={styles.confirm}>Continue</button>
          <button className={styles.go_back} onClick={() => {reset()}}>Go Back</button>
        </div>
      </div>
    </div>
  )
}
