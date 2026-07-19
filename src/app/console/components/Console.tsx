"use client"

import { Suspense, useState } from "react";
import styles from "../page.module.css"
import dynamic from "next/dynamic";
import { annotations } from "@/lib/annotations";

const DataTab = dynamic(() => import("./DataTab"))
const LabelsTab = dynamic(() => import("./LabelsTab"))
const VideoPoolTab = dynamic(() => import("./VideoPoolTab"))

const tabs = ["Data", "Labels", "Pool"]

export default function Console() {
  const [activeTab, setActiveTab] = useState("Labels")

  return (
    <div className={styles.mainContainer}>
      <div className={styles.tabContainer}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? styles.activeTab : styles.tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <Suspense fallback={<div>Loading...</div>}>
      {
        activeTab === "Data" && <DataTab /> ||
        activeTab === "Labels" && <LabelsTab labelSettings={annotations}/> ||
        activeTab === "Pool" && <VideoPoolTab />
      }
      </Suspense>
    </div>
  )
}
