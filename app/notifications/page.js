"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/notifications")
      .then((data) => {
        setNotifications(data.notifications);
        return api("/api/notifications", {}); // they have now been seen
      })
      .catch((err) => setError(err.message));
  }, []);

  if (!notifications) return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  return (
    <>
      <h1>Notifications</h1>
      <div className="card table-wrap">
        <table>
          <tbody>
            {notifications.map((n) => (
              <tr key={n._id}>
                <td>{!n.read && <span className="badge">New</span>}</td>
                <td><Link href={n.link}>{n.message}</Link></td>
                <td className="muted">{new Date(n.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {notifications.length === 0 && <tr><td className="muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
