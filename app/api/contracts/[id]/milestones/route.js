import pool from "@/lib/db";
import { ApiError, handleError, ok, parseAmount } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getContract } from "@/lib/contracts";

// The poster splits the contract into milestones. Their total cannot be more
// than the agreed amount, because that is all the money held for this contract.
export async function POST(request, { params }) {
  let conn;
  try {
    const user = await requireStudent();
    const { id } = await params;
    const { title, amount, due_date } = await request.json();

    if (!title?.trim()) throw new ApiError(400, "Milestone title is required");
    const milestoneAmount = parseAmount(amount);

    conn = await pool.getConnection();
    await conn.query("START TRANSACTION");

    // Same lock as the money routes, so two adds cannot both pass the total check.
    await conn.execute("SELECT user_id FROM USERS WHERE user_id = ? FOR UPDATE", [user.id]);

    const contract = await getContract(conn, id);
    if (contract.poster_id !== user.id) throw new ApiError(403, "Only the poster can add milestones");
    if (contract.status !== "ACTIVE") throw new ApiError(409, "This contract is not active");

    const [[check]] = await conn.execute(
      `SELECT COALESCE(SUM(amount), 0) + CAST(? AS DECIMAL(10,2)) > ? AS too_much,
              COALESCE(MAX(seq_no), 0) + 1 AS next_seq
       FROM MILESTONE WHERE contract_id = ?`,
      [milestoneAmount, contract.agreed_amount, id]
    );
    if (check.too_much) {
      throw new ApiError(400, "Milestones cannot add up to more than the agreed amount");
    }

    const [result] = await conn.execute(
      "INSERT INTO MILESTONE (contract_id, seq_no, title, amount, due_date) VALUES (?, ?, ?, ?, ?)",
      [id, check.next_seq, title.trim(), milestoneAmount, due_date || null]
    );

    await conn.query("COMMIT");
    return ok({ milestone_id: result.insertId }, 201);
  } catch (err) {
    if (conn) await conn.query("ROLLBACK");
    return handleError(err);
  } finally {
    if (conn) conn.release();
  }
}
