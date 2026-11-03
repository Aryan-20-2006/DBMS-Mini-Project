import { cookies } from "next/headers";
import { ApiError } from "./api";
import { COOKIE_NAME, signToken, verifyToken } from "./session";

export async function getSession() {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

export async function requireStudent() {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Please log in");
  if (session.role !== "STUDENT") throw new ApiError(403, "Students only");
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Please log in");
  if (session.role !== "ADMIN") throw new ApiError(403, "Admins only");
  return session;
}

export async function setSessionCookie(user) {
  const store = await cookies();
  store.set(COOKIE_NAME, await signToken(user), {
    httpOnly: true, // page JavaScript cannot read it
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
