"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ChatBox from "@/components/ChatBox";
import { api, money } from "@/lib/client";

export default function ContractPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [milestoneForm, setMilestoneForm] = useState({ title: "", amount: "", due_date: "" });
  const [reviewForm, setReviewForm] = useState({ rating: "5", comment: "" });
  const [disputeFor, setDisputeFor] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");

  const load = useCallback(() => {
    api(`/api/contracts/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs one action, shows the result and reloads the page data.
  async function run(url, body, doneMessage) {
    setError("");
    setMessage("");
    try {
      await api(url, body);
      setMessage(doneMessage);
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function addMilestone(e) {
    e.preventDefault();
    const added = await run(`/api/contracts/${id}/milestones`, milestoneForm, "Milestone added.");
    if (added) setMilestoneForm({ title: "", amount: "", due_date: "" });
  }

  async function leaveReview(e) {
    e.preventDefault();
    await run(`/api/contracts/${id}/review`, reviewForm, "Review saved. The rating was updated by the trigger.");
  }

  async function raiseDispute(e) {
    e.preventDefault();
    const raised = await run(
      `/api/milestones/${disputeFor.milestone_id}/dispute`,
      { reason: disputeReason },
      "Dispute raised. An admin will review it."
    );
    if (raised) {
      setDisputeFor(null);
      setDisputeReason("");
    }
  }

  if (!data) return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  const { contract, milestones, transactions, disputes, reviews, unallocated, role, userId } = data;
  const isActive = contract.status === "ACTIVE";
  const isClosed = contract.status === "COMPLETED" || contract.status === "REFUNDED";
  const hasReviewed = reviews.some((r) => r.reviewer_id === userId);

  return (
    <>
      <h1>{contract.title}</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card">
        <p><span className="badge" data-status={contract.status}>{contract.status}</span></p>
        <div className="stats">
          <div><strong>{money(contract.agreed_amount)}</strong><span className="muted">Agreed amount</span></div>
          <div><strong>{money(unallocated)}</strong><span className="muted">Not yet in a milestone</span></div>
          <div><strong>{contract.poster}</strong><span className="muted">Poster</span></div>
          <div><strong>{contract.worker}</strong><span className="muted">Worker</span></div>
        </div>
      </div>

      <div className="card table-wrap">
        <h2>Milestones</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Title</th><th>Amount</th><th>Due</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.milestone_id}>
                <td>{m.seq_no}</td>
                <td>{m.title}</td>
                <td>{money(m.amount)}</td>
                <td>{m.due_date ?? "-"}</td>
                <td><span className="badge" data-status={m.status}>{m.status}</span></td>
                <td>
                  {isActive && role === "WORKER" && m.status === "PENDING" && (
                    <button className="btn"
                      onClick={() => run(`/api/milestones/${m.milestone_id}/submit`, {}, "Milestone submitted.")}>
                      Mark as submitted
                    </button>
                  )}
                  {isActive && role === "POSTER" && m.status === "SUBMITTED" && (
                    <button className="btn"
                      onClick={() => run(`/api/milestones/${m.milestone_id}/approve`, {}, "Approved. The money was released to the worker.")}>
                      Approve and release
                    </button>
                  )}
                  {isActive && (m.status === "PENDING" || m.status === "SUBMITTED") && (
                    <button className="btn btn-danger" onClick={() => setDisputeFor(m)}>Raise dispute</button>
                  )}
                </td>
              </tr>
            ))}
            {milestones.length === 0 && <tr><td colSpan="6" className="muted">No milestones yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {disputeFor && (
        <form className="card" onSubmit={raiseDispute}>
          <h2>Raise a dispute on: {disputeFor.title}</h2>
          <label>Reason
            <textarea required rows="3" value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)} />
          </label>
          <button className="btn btn-danger">Submit dispute</button>
          <button type="button" className="btn-link" onClick={() => setDisputeFor(null)}>Cancel</button>
        </form>
      )}

      {disputes.length > 0 && (
        <div className="card table-wrap">
          <h2>Disputes</h2>
          <table>
            <thead>
              <tr><th>Milestone</th><th>Raised by</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.dispute_id}>
                  <td>{d.milestone}</td>
                  <td>{d.raised_by}</td>
                  <td>{d.reason}</td>
                  <td><span className="badge" data-status={d.status}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isActive && role === "POSTER" && Number(unallocated) > 0 && (
        <form className="card" onSubmit={addMilestone}>
          <h2>Add a milestone</h2>
          <div className="row">
            <label>Title
              <input required maxLength="100" value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} />
            </label>
            <label>Amount (₹)
              <input type="number" required min="0.01" step="0.01" max={unallocated} value={milestoneForm.amount}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })} />
            </label>
            <label>Due date
              <input type="date" value={milestoneForm.due_date}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} />
            </label>
            <button className="btn">Add</button>
          </div>
        </form>
      )}

      <ChatBox contractId={contract.contract_id} userId={userId} />

      <div className="card table-wrap">
        <h2>Transaction log</h2>
        <table>
          <thead>
            <tr><th>Type</th><th>Amount</th><th>From</th><th>To</th><th>Milestone</th><th>When</th></tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.txn_id}>
                <td><span className="badge" data-status={t.type}>{t.type}</span></td>
                <td>{money(t.amount)}</td>
                <td>{t.from_name}</td>
                <td>{t.to_name}</td>
                <td>{t.milestone ?? "-"}</td>
                <td>{t.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Reviews</h2>
        {reviews.map((r) => (
          <p key={r.review_id}><strong>{r.reviewer}</strong>: {r.rating}/5 {r.comment && `- ${r.comment}`}</p>
        ))}
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {isClosed && !hasReviewed && (
          <form onSubmit={leaveReview}>
            <label>Rating
              <select value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>Comment
              <textarea rows="2" value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
            </label>
            <button className="btn">Leave review</button>
          </form>
        )}
      </div>
    </>
  );
}
