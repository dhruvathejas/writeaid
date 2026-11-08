import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { toPublicUser } from "@/lib/users";
import FlipPicker from "./FlipPicker";

export default async function SetupCameraPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <FlipPicker user={toPublicUser(user)} />;
}
