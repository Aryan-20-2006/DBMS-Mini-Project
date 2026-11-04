"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, money } from "@/lib/client";

export default function TaskPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ amount: "", proposal: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    api(`/api/tasks/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function placeBid(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api(`/api/tasks/${id}/bids`, form);
      setMessage("Your bid was placed.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function acceptBid(bidId) {
    setError("");
    setMessage("");
    try {
      const { contract_id } = await api(`/api/bids/${bidId}/accept`, {});
      router.push(`/contracts/${contract_id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  const { task, bids, isPoster } = data;
  const canBid = !isPoster && task.status === "OPEN" && bids.length === 0;

  return (
    <>
      <h1>{task.title}</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card">
        <p><span className="badge" data-status={task.status}>{task.status}</span></p>
        <p>{task.description ?? "No description."}</p>
        <div className="stats">
          <div><strong>{money(task.budget)}</strong><span className="muted">Budget</span></div>
          <div><strong>{task.days_left}</strong><span className="muted">Days left ({task.deadline})</span></div>
          <div><strong>{task.category ?? "-"}</strong><span className="muted">Category</span></div>
          <div><strong>{task.poster}</strong><span className="muted">Posted by</span></div>
        </div>
      </div>

      {canBid && (
        <form className="card" onSubmit={placeBid}>
          <h2>Place a bid</h2>
          <label>Your amount (₹)
            <input type="number" required min="1" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label>Proposal
            <textarea rows="3" value={form.proposal}
              onChange={(e) => setForm({ ...form, proposal: e.target.value })} />
          </label>
          <button className="btn">Place bid</button>
        </form>
      )}

      <div className="card table-wrap">
        <h2>{isPoster ? "Bids on your task" : "Your bid"}</h2>
        <table>
          <thead>
            <tr><th>Bidder</th><th>Rating</th><th>Amount</th><th>Proposal</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <tr key={b.bid_id}>
                <td>{b.bidder}</td>
                <td>{b.avg_rating}</td>
                <td>{money(b.amount)}</td>
                <td>{b.proposal ?? "-"}</td>
                <td><span className="badge" data-status={b.status}>{b.status}</span></td>
                <td>
                  {isPoster && task.status === "OPEN" && b.status === "PENDING" && (
                    <button className="btn" onClick={() => acceptBid(b.bid_id)}>Accept and hold money</button>
                  )}
                  {b.contract_id && <Link href={`/contracts/${b.contract_id}`}>Open contract</Link>}
                </td>
              </tr>
            ))}
            {bids.length === 0 && <tr><td colSpan="6" className="muted">No bids yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
