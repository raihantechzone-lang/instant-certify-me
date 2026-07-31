import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface InstructorProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
  expertise: string | null;
  status: string; // pending | approved | rejected
  commission_rate: number;
  payout_method: string | null;
  payout_account: string | null;
  review_feedback?: string | null;
  created_at: string;
}

/**
 * Client-side instructor gate: not signed in -> /auth, signed in without an
 * approved instructor_profiles row (and not admin) -> /instructor/apply.
 * Pass `skipApprovalRedirect` for the apply page itself.
 */
export function useInstructorAccess(opts?: { skipApprovalRedirect?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [instructorProfile, setInstructorProfile] = useState<InstructorProfile | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      router.navigate({ to: "/auth", search: { mode: "login" }, replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: roles }, { data: ip }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("instructor_profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      setInstructorProfile((ip as InstructorProfile) ?? null);
      setChecking(false);
      const approved = admin || ip?.status === "approved";
      if (!approved && !opts?.skipApprovalRedirect) {
        router.navigate({ to: "/instructor/apply", replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return {
    user,
    loading: authLoading || checking,
    isAdmin,
    instructorProfile,
    isApproved: isAdmin || instructorProfile?.status === "approved",
  };
}
