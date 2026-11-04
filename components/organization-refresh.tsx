"use client";

import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The organization switcher changes Clerk's active organization without
 * changing the URL. The server-rendered page still carries the previous
 * request's token until the route is refreshed, so refresh when Clerk reports
 * a new organization.
 */
export function OrganizationRefresh() {
  const { organization } = useOrganization();
  const router = useRouter();
  const organizationId = organization?.id ?? null;
  const lastOrganizationId = useRef<string | null>(null);

  useEffect(() => {
    if (organizationId === null) {
      return;
    }

    if (
      lastOrganizationId.current !== null &&
      lastOrganizationId.current !== organizationId
    ) {
      router.refresh();
    }

    lastOrganizationId.current = organizationId;
  }, [organizationId, router]);

  return null;
}
