import Image from "next/image";
import styles from "../page.module.css";
import { client_labels, labelStamp } from "@/lib/labels";

interface Props {
  cli_labels: client_labels
  eligibleCount: number
  uniqueCreatorCount: number
}

export default function VoteCounter({ cli_labels, eligibleCount }: Props) {
  const has5 = eligibleCount >= 5

  // Prioritize severity, then 5 channel minimum over diversity
  const stamp = eligibleCount ? labelStamp(cli_labels.sub_5_votes, has5) :
  { // Todo: move later
    severity: 2,
    icon: '',
    label: { details: 'At least 1 eligible vote needed to submit' }
  }

  return (
    <div className={styles.eligible_count}>
      <b>{eligibleCount}/{has5 ? 10 : 5}</b>{" "}
      {has5 && <Image src={stamp.icon} alt="" width={20} height={20}/>}

      <div className={`${styles.eligible_count_note} ${[styles.good, styles.warn, styles.ineligible][stamp.severity]}`}>
      {
        !stamp.severity ?
        "5 or more votes will have full weight!" :

        stamp.label.details
      }
      </div>
    </div>
  )
}
