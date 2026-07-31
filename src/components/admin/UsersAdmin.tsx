import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { btnSm, btnSmGhost, card, type Notify } from "./shared";

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_blocked?: boolean | null;
}

interface RoleRow {
  user_id: string;
  role: "admin" | "instructor" | "student";
}

const ROLES: RoleRow["role"][] = ["admin", "instructor", "student"];

export default function UsersAdmin({ notify }: { notify: Notify }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const load = () => {
    supabase
      .from("profiles")
      .select("*")
      .then(({ data }) => setProfiles((data as ProfileRow[]) ?? []));
    supabase
      .from("user_roles")
      .select("user_id, role")
      .then(({ data }) => setRoles((data as RoleRow[]) ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const rolesFor = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  const toggleRole = async (uid: string, role: RoleRow["role"]) => {
    const has = rolesFor(uid).includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      notify(error ? error.message : `Removed ${role} role`);
    } else {
      const { error } = await supabase.from("user_roles").upsert({ user_id: uid, role }, { onConflict: "user_id,role" });
      notify(error ? error.message : `Granted ${role} role`);
    }
    load();
  };

  const toggleBlock = async (p: ProfileRow) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !p.is_blocked }).eq("id", p.id);
    notify(error ? error.message : p.is_blocked ? "User unblocked" : "User blocked");
    load();
  };

  const remove = async (p: ProfileRow) => {
    const { error } = await supabase.from("profiles").delete().eq("id", p.id);
    notify(error ? error.message : "Profile row deleted");
    load();
  };

  return (
    <div className={card}>
      <h2 className="font-bold text-ink mb-1">Users</h2>
      <p className="text-xs text-ink-muted mb-4">
        Deleting here only removes the profile row — deleting the auth account requires the service role key (server-side, out of scope here).
      </p>
      <ul className="divide-y divide-border">
        {profiles.map((p) => (
          <li key={p.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-bold text-ink">{p.full_name ?? p.id}</p>
              <p className="text-ink-muted">{p.phone ?? "—"}</p>
              {p.is_blocked && <p className="text-xs font-bold text-destructive">Blocked</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRole(p.id, role)}
                  className={rolesFor(p.id).includes(role) ? btnSm : "px-3 py-2 rounded-lg border border-border text-xs font-bold text-ink-muted"}
                >
                  {role}
                </button>
              ))}
              <button onClick={() => toggleBlock(p)} className={btnSm}>
                {p.is_blocked ? "Unblock" : "Block"}
              </button>
              <button onClick={() => remove(p)} className={btnSmGhost}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {profiles.length === 0 && <p className="text-sm text-ink-muted">No users yet.</p>}
      </ul>
    </div>
  );
}
