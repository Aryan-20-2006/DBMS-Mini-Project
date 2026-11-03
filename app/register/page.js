"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

const FIELDS = [
  { name: "name", label: "Full name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "srn", label: "SRN", required: true },
  { name: "department", label: "Department" },
  { name: "password", label: "Password (at least 6 characters)", type: "password", required: true },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/register", form);
      router.push("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>Create an account</h1>
      {error && <p className="error">{error}</p>}
      {FIELDS.map((f) => (
        <label key={f.name}>{f.label}
          <input type={f.type ?? "text"} required={f.required} value={form[f.name] ?? ""}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
        </label>
      ))}
      <button className="btn">Register</button>
      <p className="muted">Already registered? <Link href="/login">Log in</Link></p>
    </form>
  );
}
