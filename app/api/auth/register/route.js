import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";

export async function POST(request) {
  try {
    const { name, email, srn, department, password } = await request.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();

    if (!name?.trim() || !srn?.trim()) throw new ApiError(400, "Name and SRN are required");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new ApiError(400, "Enter a valid email");
    if (String(password ?? "").length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters");
    }

    // Login checks both tables, so an email cannot belong to an admin and a student.
    const [admins] = await pool.execute("SELECT admin_id FROM ADMIN WHERE email = ?", [cleanEmail]);
    if (admins.length > 0) throw new ApiError(409, "That email or SRN is already registered");

    const passwordHash = await bcrypt.hash(password, 10);

    // role is not taken from the form, so nobody can register as an admin.
    await pool.execute(
      `INSERT INTO USERS (name, email, srn, department, role, password_hash)
       VALUES (?, ?, ?, ?, 'STUDENT', ?)`,
      [name.trim(), cleanEmail, srn.trim(), department?.trim() || null, passwordHash]
    );
    return ok({ message: "Registered" }, 201);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return handleError(new ApiError(409, "That email or SRN is already registered"));
    }
    return handleError(err);
  }
}
