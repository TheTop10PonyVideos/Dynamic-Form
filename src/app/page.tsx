import { cookies } from "next/headers";
import VoteForm from "./components/voting_form";
import { getBallotItems } from "@/lib/queries/ballot";
import styles from "./page.module.css"
import { getChannelLink, getVotingPeriod, isFormOpen, toClientVideoMetadata } from "@/lib/util";
import { video_check } from "@/lib/vote_rules";
import { getRecentCreators } from "@/lib/queries/etc";

// Initialize entries to be shown if the user had previously made any in their ballot
export default async function Home() {
  const userCookies = await cookies()
  const uid = userCookies.get("uid")!.value
  const ballotItems = await getBallotItems(uid)

  const dataItems = ballotItems.map(i => ({
    ...i.video_metadata,
    ballot_index: i.index
  }))

  const initial_entries: any[] = Array.from({ length: 10 }, () => ({ flags: [], videoData: null, input: "" }))
  dataItems.forEach(item => initial_entries[item.ballot_index].videoData = item)

  initial_entries.map(entry => {
    if (!entry.videoData)
      return

    entry.flags = video_check(entry.videoData)
    entry.videoData = toClientVideoMetadata(entry.videoData)
    entry.input = entry.videoData.link
  })

  const recentCreators = (await getRecentCreators()).map(c => ({
    channelURL: getChannelLink(c),
    profileImgURL: c.pfp_url,
    channelName: c.channel_name
  }))

  return (
    <div className={styles.page}>
      <VoteForm
        votingPeriod={getVotingPeriod()}
        formOpen={isFormOpen()}
        initialEntries={initial_entries}
        recentCreators={recentCreators}
      />
    </div>
  )
}
