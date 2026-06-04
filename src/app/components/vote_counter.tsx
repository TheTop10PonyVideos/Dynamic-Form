import Image from "next/image";
import styles from "../page.module.css";
import { labels } from "@/lib/labels";

interface Props {
  eligibleCount: number
}

export default function VoteCounter({ eligibleCount }: Props) {
  const has5 = eligibleCount >= 5

  const [note, coloring] = (
    !eligibleCount ? [labels.zero_votes.details, styles.ineligible] :
    !has5 ? [labels.sub_5_votes.details, styles.warn] :
    ['All votes will have full weight!', styles.good]
  )

  return (
    <div className={styles.eligible_count}>
      <b>{eligibleCount}/{has5 ? 10 : 5}</b>{' '}

      {
        has5 &&
        <Image src={'checkmark.svg'} alt="" width={20} height={20}/>
      }

      <div className={`${styles.eligible_count_note} ${coloring}`}>{note}</div>
    </div>
  )
}
