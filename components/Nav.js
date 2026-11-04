"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const onAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (onAuthPage) return;
    api("/api/auth/me")
      .then((me) => {
        setUser(me);
        if (me.role !== "STUDENT") return;
        // A MongoDB problem should not break the page, so this one may fail quietly.
        api("/api/notifications")
          .then((data) => setUnread(data.notifications.filter((n) => !n.read).length))
          .catch(() => setUnread(0));
      })
      .catch(() => setUser(null));
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
                <Link href="/tasks" aria-current={pathname === "/tasks" ? "page" : undefined}>Browse tasks</Link>
                <Link href="/tasks/new" aria-current={pathname === "/tasks/new" ? "page" : undefined}>Post a task</Link>
                <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>Dashboard</Link>
                <Link href="/notifications" aria-current={pathname === "/notifications" ? "page" : undefined}>
                  Notifications {unread > 0 && <span className="badge">{unread}</span>}
                </Link>
              </>
            ) : (
              <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}>Disputes</Link>
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
