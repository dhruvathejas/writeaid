import { redirect } from "next/navigation";
import { sendWeeklyReportIfDue } from "@/lib/report";
import { getCurrentUser } from "@/lib/session";
import { toPublicUser } from "@/lib/users";
import Game from "./Game";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.flipMode) redirect("/setup-camera");
  sendWeeklyReportIfDue(user);
  return <Game user={toPublicUser(user)} />;
}
