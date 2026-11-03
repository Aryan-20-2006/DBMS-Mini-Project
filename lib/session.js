import { SignJWT, jwtVerify } from "jose";

// Signing and checking the login token. Kept separate from auth.js
// because proxy.js needs it too.
export const COOKIE_NAME = "session";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export function signToken(user) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(secret());
}

// Returns { id, name, role }, or null if the token is missing, forged or expired.
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}
