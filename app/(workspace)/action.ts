'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { env } from '@/lib/env';
import { PipelineError } from '@/lib/pipeline/github';
import {
  AlreadyRunningError,
  claimAnalysis,
  continueRun,
  type ClaimedRun,
} from '@/lib/pipeline/run';
import { submitRepository } from '@/lib/pipeline/submit';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

export type FormState = { error: string | null };

export type InviteState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

// Invitations are Clerk's; this only decides who may send one and where it
// lands. The active organization comes from the session token, never the form.
export async function inviteMember(
  _previous: InviteState,
  form: FormData
): Promise<InviteState> {
  const { orgId, orgRole, userId } = await auth();
  if (!userId || !orgId)
    return {
      status: 'error',
      message: 'Your session no longer has an active organization.',
    };
  if (orgRole !== 'org:admin')
    return {
      status: 'error',
      message: 'Only organization admins can invite members.',
    };

  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { status: 'error', message: 'Enter a valid email address.' };
  const role = form.get('role') === 'org:admin' ? 'org:admin' : 'org:member';

  try {
    await (
      await clerkClient()
    ).organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role,
      inviterUserId: userId,
      redirectUrl: `${new URL(env('NEXT_PUBLIC_APP_URL')).origin}/sign-in`,
    });
  } catch (error) {
    return { status: 'error', message: clerkErrorMessage(error) };
  }

  revalidatePath('/');
  return { status: 'success', message: `Invitation sent to ${email}.` };
}

function clerkErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray(error.errors)
  ) {
    const first = error.errors[0] as { longMessage?: string; message?: string };
    return first.longMessage || first.message || 'Could not send the invitation.';
  }
  return error instanceof Error
    ? error.message
    : 'Could not send the invitation. Try again.';
}

// Pasting a URL creates the analysis and starts it, or, if this organization
// already has one for the repository, goes to it without running anything.
// The organization comes off the session token, never from the form.
export async function submitAnalysis(
  _previous: FormState,
  form: FormData
): Promise<FormState> {
  const { orgId } = await auth();
  if (!orgId) return { error: 'No active organization' };
  const url = form.get('url');
  if (typeof url !== 'string' || !url.trim())
    return { error: 'Paste a GitHub repository URL' };

  const admin = createAdminSupabase();
  let analysisId: string;
  try {
    const submission = await submitRepository(admin, orgId, url);
    analysisId = submission.analysisId;
    if (submission.created) start(await claimAnalysis(admin, analysisId));
  } catch (error) {
    if (error instanceof PipelineError) return { error: error.message };
    throw error;
  }
  redirect(`/analyses/${analysisId}`);
}

// Re-running is only ever this: a deliberate act from the analysis itself.
export async function rerunAnalysis(analysisId: string): Promise<FormState> {
  // Visibility is the policy's call: another organization's analysis isn't
  // there to re-run. The writer below bypasses policies, so this read comes first.
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('analyses')
    .select('id')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read analysis: ${error.message}`);
  if (!data) return { error: 'Analysis not found' };

  try {
    start(await claimAnalysis(createAdminSupabase(), analysisId));
  } catch (error) {
    if (error instanceof AlreadyRunningError)
      return { error: "It's already running" };
    throw error;
  }
  return { error: null };
}

// The run outlives the response. It records its own failure on the row; this
// only makes sure nothing is lost if even that fails.
function start(claimed: ClaimedRun): void {
  after(async () => {
    try {
      await continueRun(createAdminSupabase(), claimed);
    } catch (error) {
      console.error(`Analysis ${claimed.analysisId} failed:`, error);
    }
  });
}
