import type { ReactNode } from "react";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let userEmail = (sessionClaims?.email as string | undefined)?.toLowerCase();
  if (!userEmail) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    userEmail = user.emailAddresses
      .find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress?.toLowerCase();
  }

  const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isSuperAdmin = !!userEmail && allowedEmails.includes(userEmail);

  return (
    <DashboardShell isSuperAdmin={isSuperAdmin}>{children}</DashboardShell>
  );
}
