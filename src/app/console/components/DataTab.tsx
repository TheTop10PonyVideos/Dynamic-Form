import styles from "../page.module.css"

export default function DataTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h2>Tab still a WIP</h2>
      You can download all of the data currently stored by this form here
      <a
        href="/api/stored_data"
        className={styles.downloadBtn}
      >
        Download XLSX
      </a>
    </div>
  )
}
