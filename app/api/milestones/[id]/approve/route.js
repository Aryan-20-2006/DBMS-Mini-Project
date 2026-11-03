import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getContract, updateContractAfterPayment } from "@/lib/contracts";

// Approve a milestone: moves its amount from the poster's escrow to the worker's balance.
export async function POST(request, { params }) {
  let conn;
  try {
    const user = await requireStudent();
    const { id } = await params;

    conn = await pool.getConnection();
    await conn.query("START TRANSACTION");

    // Lock the poster first, so a double click cannot pay the worker twice:
    // the second request waits here, then sees the milestone is already APPROVED.
    await conn.execute("SELECT held_amount FROM USERS WHERE user_id = ? FOR UPDATE", [user.id]);

    const [milestones] = await conn.execute(
      "SELECT * FROM MILESTONE WHERE milestone_id = ? FOR UPDATE",
      [id]
    );
    const milestone = milestones[0];
    if (!milestone) throw new ApiError(404, "Milestone not found");

    const contract = await getContract(conn, milestone.contract_id);
    if (contract.poster_id !== user.id) throw new ApiError(403, "Only the poster can approve a milestone");
    if (contract.status !== "ACTIVE") throw new ApiError(409, "This contract is not active");
    if (milestone.status !== "SUBMITTED") {
      throw new ApiError(409, "Only a submitted milestone can be approved");
    }

    await conn.execute(
      "UPDATE USERS SET held_amount = held_amount - ? WHERE user_id = ?",
      [milestone.amount, contract.poster_id]
    );
    await conn.execute(
      "UPDATE USERS SET balance = balance + ? WHERE user_id = ?",
      [milestone.amount, contract.worker_id]
    );
    await conn.execute("UPDATE MILESTONE SET status = 'APPROVED' WHERE milestone_id = ?", [id]);
    await conn.execute(
      `INSERT INTO TRANSACTION_LOG (contract_id, milestone_id, type, amount, from_user, to_user)
       VALUES (?, ?, 'RELEASE', ?, ?, ?)`,
      [contract.contract_id, id, milestone.amount, contract.poster_id, contract.worker_id]
    );

    await updateContractAfterPayment(conn, contract);

    await conn.query("COMMIT");
    return ok({ message: "Approved" });
  } catch (err) {
    if (conn) await conn.query("ROLLBACK");
    return handleError(err);
  } finally {
    if (conn) conn.release();
  }
}
