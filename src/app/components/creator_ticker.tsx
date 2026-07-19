import { CreatorDisplayData } from '@/lib/types'
import styles from '../page.module.css'

interface Props {
  displayData: CreatorDisplayData[]
}

export default function CreatorTicker({ displayData }: Props) {
  const items = displayData.map((c, i) =>
    <div key={i} className={styles.ticker_item}>
      {c.profileImgURL &&
        <img src={c.profileImgURL} className={styles.profile_icon}/>
      }
      <a href={c.channelURL} className={styles.channel_anchor}>{c.channelName}</a>
    </div>
  )
  return (
    <div className={`${styles.field} ${styles.ticker_container}`} style={{ minHeight: 5 }}>
      <div
        className={styles.ticker_track}
        style={{ animation: `${styles.ticker_scroll} ${3 * displayData.length}s linear infinite` }}
      >
        <div className={styles.ticker_content}>
          {items}
        </div>
        <div className={styles.ticker_content}>
          {items}
        </div>
      </div>
    </div>
  )
}
