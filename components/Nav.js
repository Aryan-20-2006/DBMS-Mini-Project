"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const onAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (onAuthPage) return;
    api("/api/auth/me").then(setUser).catch(() => setUser(null));
  }, [onAuthPage, pathname]);

  async function logout() {
    await api("/api/auth/logout", {});
    window.location.href = "/login";
  }

  return (
    <header className="nav">
      <strong className="brand">Campus Task Board</strong>
      {!onAuthPage && user && (
        <>
          <nav>
            {user.role === "STUDENT" ? (
              <>
                <Link href="/tasks">Browse tasks</Link>
                <Link href="/tasks/new">Post a task</Link>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/notifications">Notifications</Link>
              </>
            ) : (
              <Link href="/admin">Disputes</Link>
            )}
          </nav>
          <span className="nav-user">
            {user.name}
            <button className="btn-link" onClick={logout}>Log out</button>
          </span>
        </>
      )}
    </header>
  );
}
