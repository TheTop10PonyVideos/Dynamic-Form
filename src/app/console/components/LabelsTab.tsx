"use client";

import { useRef, useState } from "react";
import styles from "../page.module.css";
import Image from "next/image";
import VoteField from "@/app/components/vote_field";
import { testLink } from "@/lib/util";
import { validate, updateLabels } from "@/lib/api/video";
import { BallotEntryField, Flag } from "@/lib/types";
import { label_key, labels, stampMap } from "@/lib/labels";
import { ballot_check, isEligible } from "@/lib/vote_rules";

interface Props {
  labelSettings: Record<label_key, Flag>
}

export default function LabelsTab({ labelSettings }: Props) {
  const [voteFields, setVoteFields] = useState<BallotEntryField[]>([{ flags: [], videoData: null, input: "" }])
  const [labelsConfigs, setLabels] = useState(labelSettings)
  const inputTimeouts = useRef<NodeJS.Timeout[]>([])
  const [changesSaved, setSaved] = useState(true)
  const savedLabels = useRef(JSON.stringify(labelsConfigs))
  const pasting = useRef(false)

  const labelChange = (key: label_key, newVals: Partial<Flag>) => {
    const updated = {...labelsConfigs}
    updated[key] = { ...updated[key], ...newVals }

    setLabels(updated)
    setSaved(JSON.stringify(updated) === savedLabels.current)
  }

  const updateField = (index: number, newFieldVals: Partial<BallotEntryField>) => {
    setVoteFields(prevFields => {
      const updated = [...prevFields]
      updated[index] = { ...updated[index], ...newFieldVals }
      return updated
    })
  }

  /**
   * Rerender the page using the results of the validation request
   */
  const applyValidation = async (input: string, field_index: number) => {
    const { field_flags, video_data } = await validate(input)
    updateField(field_index, { flags: field_flags, videoData: video_data || null })
  }

  const voteFieldEdit = async (e: React.ChangeEvent<HTMLInputElement>, field_index: number) => {    
    const input = e.currentTarget.value.trim()
    const isLink = testLink(input)

    clearTimeout(inputTimeouts.current[field_index])

    if (!input)
      updateField(field_index, { input, videoData: null, flags: [] })
    else if (!isLink)
      updateField(field_index, { input, videoData: null, flags: [labels.invalid_link] })
    else if (isLink.length)
      updateField(field_index, { input, videoData: null, flags: isLink })
    else if (pasting.current) {
      pasting.current = false
      updateField(field_index, { input, videoData: undefined })
      applyValidation(input, field_index)
    }
    else {
      updateField(field_index, { input, videoData: undefined, flags: [] })
      inputTimeouts.current[field_index] = setTimeout(() => applyValidation(input, field_index), 2500)
    }
  }

  const pasted = () => { pasting.current = true }

  const saveChanges = async () => {
    const res = await updateLabels(labelsConfigs)

    if (res.status === 200) {
      savedLabels.current = JSON.stringify(labelsConfigs)
      setSaved(true)
    }
    else
      alert("Failed to save")
  }

  const newLabelMap = new Map<string, Flag>(Object.values(labelsConfigs).map(label => [label.trigger, label]))
  const activeLabels = new Set<string>()

  // Using client bundled labels here is fine since it's used only to determine active labels
  const checkedEntries = ballot_check(voteFields)
  const eligibleCount = checkedEntries.filter(isEligible).length

  if (eligibleCount < 5)
    activeLabels.add(labels.sub_5_votes.trigger)

  // Apply label configuration fields for previewing
  const withPreviews = checkedEntries.map(e => (
    {
      ...e,
      flags: e.flags.map(f => {
        activeLabels.add(f.trigger)
        return newLabelMap.get(f.trigger) || f 
      })
    }
  ))

  return (
    <div className={styles.tabContents}>
      <div className={styles.testFields}>
        {withPreviews.map((field, i) =>
          // TODO: make a VoteFields component that includes each field and the group's states so this has the same updates as ones made for the main page
          <VoteField
            key={i}
            index={i}
            fieldData={field}
            focused={false}
            onChanged={voteFieldEdit}
            onPaste={pasted}
            onEntryReplacement={() => {}}
            setFocus={() => {}}
          />
        )}
      </div>

      <div className={styles.buttonRow}>
        { voteFields.length < 10 &&
          <button onClick={() => setVoteFields([...voteFields, { flags: [], videoData: null, input: "" }])}>+</button>
        }
        { voteFields.length > 1 &&
          <button onClick={() => setVoteFields(voteFields.slice(0, -1))}>-</button>
        }
      </div>

      <div className={styles.labelSettingsContainer}>
        {Object.entries(labelsConfigs).map(([labelKey, label], index) => (
          <div key={index} className={`${styles.labelSettings} ${activeLabels.has(label.trigger) && styles.activeLabel}`}>
            <div className={styles.hoverInfo}>
              <div className={styles.triggeredBy}>Triggered by: {label.trigger}</div>
            </div>

            <div className={styles.inputGroup}>
              <input
                type="text"
                value={label.name}
                onChange={(e) => labelChange(labelKey as label_key, { name: e.target.value })}
                className={styles.labelNameField}
                placeholder="Name"
              />

              <input
                type="text"
                value={label.details}
                onChange={(e) => labelChange(labelKey as label_key, { details: e.target.value })}
                className={styles.labelDetailsField}
                placeholder="Details"
              />

              <button
                className={styles.iconButton}
                onClick={() => {
                  const t = label.type
                  labelChange(labelKey as label_key, { type: t === "ineligible" && "maybe ineligible" || "ineligible"})
                }}
              >
                <Image
                  src={stampMap[label.type].icon}
                  alt=""
                  width={24}
                  height={24}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className={`${styles.saveButton} ${!changesSaved && styles.saveActive}`} onClick={saveChanges}>Save</button>
    </div>
  )
}
