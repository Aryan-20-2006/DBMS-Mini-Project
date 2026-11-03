import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getContract, getContractForParty } from "@/lib/contracts";

// The poster or worker raises a dispute on a milestone. No money moves yet: it
// stays in escrow, and the contract is frozen until an admin resolves it.
export async function POST(request, { params }) {
  let conn;
  try {
    const user = await requireStudent();
    const { id } = await params;
    const { reason } = await request.json();
    if (!reason?.trim()) throw new ApiError(400, "Please give a reason");

    // Read outside the transaction only to find out whose row to lock.
    const [found] = await pool.execute("SELECT contract_id FROM MILESTONE WHERE milestone_id = ?", [id]);
    if (!found[0]) throw new ApiError(404, "Milestone not found");
    const { poster_id } = await getContractForParty(pool, found[0].contract_id, user.id);

    conn = await pool.getConnection();
    await conn.query("START TRANSACTION");

    // Same lock as approve, so a milestone cannot be approved and disputed at once.
    await conn.execute("SELECT user_id FROM USERS WHERE user_id = ? FOR UPDATE", [poster_id]);

    const [milestones] = await conn.execute(
      "SELECT status, contract_id FROM MILESTONE WHERE milestone_id = ? FOR UPDATE",
      [id]
    );
    const contract = await getContract(conn, milestones[0].contract_id);
    if (contract.status !== "ACTIVE") throw new ApiError(409, "This contract is not active");
    if (milestones[0].status !== "PENDING" && milestones[0].status !== "SUBMITTED") {
      throw new ApiError(409, "This milestone cannot be disputed");
    }

    const [result] = await conn.execute(
      "INSERT INTO DISPUTE (milestone_id, raised_by, reason) VALUES (?, ?, ?)",
      [id, user.id, reason.trim()]
    );
    await conn.execute("UPDATE MILESTONE SET status = 'FLAGGED' WHERE milestone_id = ?", [id]);
    await conn.execute("UPDATE CONTRACT SET status = 'DISPUTED' WHERE contract_id = ?", [contract.contract_id]);

    await conn.query("COMMIT");
    return ok({ dispute_id: result.insertId }, 201);
  } catch (err) {
    if (conn) await conn.query("ROLLBACK");
    return handleError(err);
  } finally {
    if (conn) conn.release();
  }
}
