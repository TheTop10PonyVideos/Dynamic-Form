import Console from "./components/Console";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";


export default async function ConsolePage() {
  const userCookies = await cookies()
  const uid = userCookies.get("uid")!.value

  if (uid !== process.env.OPERATOR)
    redirect('/login')

  return <Console/>
}
