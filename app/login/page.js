"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const { role } = await api("/api/auth/login", form);
      window.location.href = role === "ADMIN" ? "/admin" : "/tasks";
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>👋 Log in</h1>
      {error && <p className="error">{error}</p>}
      <label>Email
        <input type="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label>Password
        <input type="password" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      <button className="btn">Log in</button>
      <p className="muted">New here? <Link href="/register">Create an account</Link></p>
    </form>
  );
}
