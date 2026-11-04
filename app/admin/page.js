"use client";

import { useCallback, useEffect, useState } from "react";
import { api, money } from "@/lib/client";

export default function AdminPage() {
  const [disputes, setDisputes] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    api("/api/admin/disputes").then((data) => setDisputes(data.disputes)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refund(id) {
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/disputes/${id}/refund`, {});
      setMessage("Refunded. The money went back to the poster.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!disputes) return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  const open = disputes.filter((d) => d.status === "OPEN");
  const resolved = disputes.filter((d) => d.status !== "OPEN");

  return (
    <>
      <h1>🛡️ Admin dashboard</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card table-wrap">
        <h2>⚠️ Open disputes ({open.length})</h2>
        <table>
          <thead>
            <tr><th>Task</th><th>Milestone</th><th>Amount</th><th>Poster</th><th>Worker</th><th>Raised by</th><th>Reason</th><th>Action</th></tr>
          </thead>
          <tbody>
            {open.map((d) => (
              <tr key={d.dispute_id}>
                <td>{d.task_title}</td>
                <td>{d.milestone}</td>
                <td>{money(d.amount)}</td>
                <td>{d.poster}</td>
                <td>{d.worker}</td>
                <td>{d.raised_by}</td>
                <td>{d.reason}</td>
                <td><button className="btn btn-danger" onClick={() => refund(d.dispute_id)}>↩️ Refund poster</button></td>
              </tr>
            ))}
            {open.length === 0 && <tr><td colSpan="8" className="muted">No open disputes.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <h2>✅ Resolved disputes</h2>
        <table>
          <thead>
            <tr><th>Task</th><th>Milestone</th><th>Amount</th><th>Reason</th><th>Status</th><th>Handled by</th></tr>
          </thead>
          <tbody>
            {resolved.map((d) => (
              <tr key={d.dispute_id}>
                <td>{d.task_title}</td>
                <td>{d.milestone}</td>
                <td>{money(d.amount)}</td>
                <td>{d.reason}</td>
                <td><span className="badge" data-status={d.status}>{d.status}</span></td>
                <td>{d.handled_by}</td>
              </tr>
            ))}
            {resolved.length === 0 && <tr><td colSpan="6" className="muted">None yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
