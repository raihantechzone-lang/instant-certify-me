import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminGuard,
});

const SESSION_KEY = "gators-admin-session";

function AdminGuard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthed(localStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return <Outlet />;
}
