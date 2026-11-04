"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function NewTaskPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", budget: "", deadline: "", category_id: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/tasks").then((data) => setCategories(data.categories)).catch((err) => setError(err.message));
  }, []);

  function update(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { task_id } = await api("/api/tasks", form);
      router.push(`/tasks/${task_id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>📝 Post a task</h1>
      {error && <p className="error">{error}</p>}
      <label>Title
        <input required maxLength="150" value={form.title} onChange={(e) => update("title", e.target.value)} />
      </label>
      <label>Description
        <textarea rows="4" value={form.description} onChange={(e) => update("description", e.target.value)} />
      </label>
      <label>Category
        <select value={form.category_id} onChange={(e) => update("category_id", e.target.value)}>
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>Budget (₹)
        <input type="number" required min="1" step="0.01" value={form.budget}
          onChange={(e) => update("budget", e.target.value)} />
      </label>
      <label>Deadline
        <input type="date" required value={form.deadline} onChange={(e) => update("deadline", e.target.value)} />
      </label>
      <button className="btn">🚀 Post task</button>
    </form>
  );
}
