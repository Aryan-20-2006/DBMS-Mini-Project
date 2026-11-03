import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();

    // Admins come from the ADMIN table, students from USERS.
    const [admins] = await pool.execute(
      "SELECT admin_id AS id, name, password_hash FROM ADMIN WHERE email = ?",
      [cleanEmail]
    );
    const [students] = await pool.execute(
      "SELECT user_id AS id, name, password_hash FROM USERS WHERE email = ?",
      [cleanEmail]
    );
    const account = admins[0] ?? students[0];
    const role = admins[0] ? "ADMIN" : "STUDENT";

    // Same message either way, so the form does not reveal which emails exist.
    if (!account || !(await bcrypt.compare(String(password ?? ""), account.password_hash))) {
      throw new ApiError(401, "Wrong email or password");
    }

    await setSessionCookie({ id: account.id, name: account.name, role });
    return ok({ role });
  } catch (err) {
    return handleError(err);
  }
}
