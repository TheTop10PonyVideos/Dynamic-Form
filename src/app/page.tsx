import { cookies } from "next/headers";
import VoteForm from "./components/voting_form";
import { getBallotItems } from "@/lib/queries/ballot";
import styles from "./page.module.css"
import { getVotingPeriod, toClientVideoMetadata } from "@/lib/util";
import { video_check } from "@/lib/vote_rules";

// Initialize entries to be shown if the user had previously made any in their ballot
export default async function Home() {
  const userCookies = await cookies()
  const uid = userCookies.get("uid")!.value
  const ballotItems = await getBallotItems(uid)

  const dataItems = ballotItems.map(i => ({
    ...i.video_metadata,
    ballot_index: i.index
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initial_entries: any[] = Array.from({ length: 10 }, () => ({ flags: [], videoData: null, input: "" }))
  dataItems.forEach(item => initial_entries[item.ballot_index].videoData = item)

  await Promise.all(
      initial_entries.map(async entry => {
      if (!entry.videoData)
        return

      entry.flags = await video_check(entry.videoData)
      entry.videoData = toClientVideoMetadata(entry.videoData)
      entry.input = entry.videoData.link
    })
  )

  return (
    <div className={styles.page}>
      <VoteForm initial_entries={initial_entries} votingPeriod={getVotingPeriod()}/>
    </div>
  )
}
