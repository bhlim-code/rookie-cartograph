import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Activate } from "./activate";

export const instant = false;

export default async function StartPage() {
  const { orgId, sessionStatus, userId } = await auth({
    treatPendingAsSignedOut: false,
  });

  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId && sessionStatus !== "pending") {
    redirect("/");
  }

  return <Activate />;
}
