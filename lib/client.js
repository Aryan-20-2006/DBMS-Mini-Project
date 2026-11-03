// Used by pages in the browser to call the route handlers.
export async function api(url, body, method) {
  const res = await fetch(url, {
    method: method ?? (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && url !== "/api/auth/login") {
    window.location.href = "/login";
  }
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function money(value) {
  return "₹" + Number(value ?? 0).toFixed(2);
}
