"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, money } from "@/lib/client";

export default function BrowseTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", maxBudget: "" });
  const [error, setError] = useState("");

  async function load(active) {
    setError("");
    try {
      const data = await api("/api/tasks?" + new URLSearchParams(active));
      setTasks(data.tasks);
      setCategories(data.categories);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load({ search: "", category: "", maxBudget: "" });
  }, []);

  function submit(e) {
    e.preventDefault();
    load(filters);
  }

  return (
    <>
      <h1>🔍 Open tasks</h1>
      <form className="card row" onSubmit={submit}>
        <label>Search title
          <input value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </label>
        <label>Category
          <select value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>Max budget
          <input type="number" min="1" step="0.01" value={filters.maxBudget}
            onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })} />
        </label>
        <button className="btn">🔍 Filter</button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Task</th><th>Category</th><th>Posted by</th><th>Budget</th><th>Days left</th><th>Bids</th></tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.task_id}>
                <td><Link href={`/tasks/${t.task_id}`}>{t.title}</Link></td>
                <td>{t.category ?? "-"}</td>
                <td>{t.poster}</td>
                <td>{money(t.budget)}</td>
                <td>{t.days_left}</td>
                <td>{t.bid_count}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan="6" className="muted">No open tasks match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
