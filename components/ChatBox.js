"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

// Chat for one contract. Checks for new messages every 3 seconds.
export default function ChatBox({ contractId, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/api/contracts/${contractId}/messages`)
      .then((data) => {
        setMessages(data.messages);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [contractId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function send(e) {
    e.preventDefault();
    try {
      await api(`/api/contracts/${contractId}/messages`, { text });
      setText("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h2>Chat</h2>
      {error && <p className="error">{error}</p>}
      <div className="chat">
        {messages.map((m) => (
          <p key={m._id}>
            <strong>{m.sender_id === userId ? "You" : m.sender_name}:</strong> {m.text}{" "}
            <span className="muted">{new Date(m.created_at).toLocaleTimeString()}</span>
          </p>
        ))}
        {messages.length === 0 && <p className="muted">No messages yet.</p>}
      </div>
      <form className="row" onSubmit={send}>
        <label>Message
          <input required maxLength="1000" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button className="btn">Send</button>
      </form>
    </div>
  );
}
