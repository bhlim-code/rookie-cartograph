"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export type ResolveOrganizationResult =
  | { ok: true; organizationId: string }
  | { ok: false; message: string };

function organizationName(user: {
  firstName: string | null;
  username: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}) {
  const first = user.firstName?.trim();
  const username = user.username?.trim();
  const email = user.primaryEmailAddress?.emailAddress;
  const base = first || username || email?.split("@")[0] || "My";

  return `${base}'s workspace`;
}

// The one place the app resolves or creates the first organization. After this,
// everything downstream reads the organization from the session claims.
export async function resolveOrganization(): Promise<ResolveOrganizationResult> {
  const { userId } = await auth({ treatPendingAsSignedOut: false });

  if (!userId) {
    return { ok: false, message: "Your session is no longer signed in." };
  }

  try {
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
      limit: 1,
    });
    const existing = memberships.data[0];

    if (existing) {
      return { ok: true, organizationId: existing.organization.id };
    }

    const user = await clerk.users.getUser(userId);
    const organization = await clerk.organizations.createOrganization({
      name: organizationName(user),
      createdBy: userId,
    });

    return { ok: true, organizationId: organization.id };
  } catch (error) {
    console.error("Could not resolve the initial organization.", error);

    return {
      ok: false,
      message: "Could not set up your organization. Try again.",
    };
  }
}
