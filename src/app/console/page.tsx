import { getLabels } from "@/lib/data_cache";
import Console from "./components/Console";
import { cookies } from "next/headers";
import { forbidden } from "next/navigation";

export default async function ConsolePage() {
  const userCookies = await cookies()
  const uid = userCookies.get("uid")!.value

  if (uid !== process.env.OPERATOR)
    forbidden() // TODO: keep an eye on this between nextjs updates since it's experimental
  
  const label_configs = await getLabels()

  return <Console labelConfigs={label_configs} />
}
