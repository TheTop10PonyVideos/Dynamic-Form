import { CreatorDisplayData } from '@/lib/types'
import styles from '../page.module.css'

interface Props {
  displayData: CreatorDisplayData[]
}

export default function CreatorTicker({ displayData }: Props) {
  return (
    <div className={styles.field} style={{ minHeight: 5 }}>
      {displayData.map(c => (
        <div>
          {c.channelName}
        </div>
      ))}
    </div>
  )
}