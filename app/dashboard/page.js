"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, money } from "@/lib/client";

function ContractTable({ title, contracts }) {
  return (
    <div className="card table-wrap">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr><th>Task</th><th>Poster</th><th>Worker</th><th>Agreed</th><th>Status</th></tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.contract_id}>
              <td><Link href={`/contracts/${c.contract_id}`}>{c.task_title}</Link></td>
              <td>{c.poster}</td>
              <td>{c.worker}</td>
              <td>{money(c.agreed_amount)}</td>
              <td><span className="badge" data-status={c.status}>{c.status}</span></td>
            </tr>
          ))}
          {contracts.length === 0 && <tr><td colSpan="5" className="muted">None.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);

  if (!data) return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  const { wallet, summary, liveRating, myTasks, myBids, activeContracts, otherContracts } = data;

  return (
    <>
      <h1>📊 Dashboard</h1>

      <div className="card">
        <h2>💰 My wallet</h2>
        <div className="stats">
          <div><strong>{money(wallet.balance)}</strong><span className="muted">💵 Available</span></div>
          <div><strong>{money(wallet.held_amount)}</strong><span className="muted">🔒 Held in escrow</span></div>
          <div><strong>{wallet.avg_rating}</strong><span className="muted">⭐ Rating (stored, set by trigger)</span></div>
          <div><strong>{liveRating}</strong><span className="muted">⭐ Rating (fn_avg_rating)</span></div>
          <div><strong>{summary.bids_placed}</strong><span className="muted">🙋 Bids placed</span></div>
        </div>
      </div>

      <ContractTable title="🤝 Active contracts" contracts={activeContracts} />
      <ContractTable title="📁 Disputed and closed contracts" contracts={otherContracts} />

      <div className="card table-wrap">
        <h2>📋 My tasks</h2>
        <table>
          <thead>
            <tr><th>Task</th><th>Budget</th><th>Deadline</th><th>Bids</th><th>Status</th></tr>
          </thead>
          <tbody>
            {myTasks.map((t) => (
              <tr key={t.task_id}>
                <td><Link href={`/tasks/${t.task_id}`}>{t.title}</Link></td>
                <td>{money(t.budget)}</td>
                <td>{t.deadline}</td>
                <td>{t.bid_count}</td>
                <td><span className="badge" data-status={t.status}>{t.status}</span></td>
              </tr>
            ))}
            {myTasks.length === 0 && <tr><td colSpan="5" className="muted">None.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <h2>🙋 My bids</h2>
        <table>
          <thead>
            <tr><th>Task</th><th>Amount</th><th>Status</th><th>Contract</th></tr>
          </thead>
          <tbody>
            {myBids.map((b) => (
              <tr key={b.bid_id}>
                <td><Link href={`/tasks/${b.task_id}`}>{b.title}</Link></td>
                <td>{money(b.amount)}</td>
                <td><span className="badge" data-status={b.status}>{b.status}</span></td>
                <td>{b.contract_id ? <Link href={`/contracts/${b.contract_id}`}>Open</Link> : "-"}</td>
              </tr>
            ))}
            {myBids.length === 0 && <tr><td colSpan="4" className="muted">None.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
