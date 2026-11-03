import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getContract, updateContractAfterPayment } from "@/lib/contracts";

// The admin resolves a dispute with a refund: the disputed milestone's amount
// moves from the poster's escrow back to the poster's balance.
export async function POST(request, { params }) {
  let conn;
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Read outside the transaction only to find out whose row to lock.
    const [found] = await pool.execute(
      `SELECT m.contract_id
       FROM DISPUTE d JOIN MILESTONE m ON d.milestone_id = m.milestone_id
       WHERE d.dispute_id = ?`,
      [id]
    );
    if (!found[0]) throw new ApiError(404, "Dispute not found");
    const { poster_id } = await getContract(pool, found[0].contract_id);

    conn = await pool.getConnection();
    await conn.query("START TRANSACTION");

    await conn.execute("SELECT held_amount FROM USERS WHERE user_id = ? FOR UPDATE", [poster_id]);

    const [disputes] = await conn.execute(
      `SELECT d.status, d.milestone_id, m.amount, m.contract_id
       FROM DISPUTE d JOIN MILESTONE m ON d.milestone_id = m.milestone_id
       WHERE d.dispute_id = ? FOR UPDATE`,
      [id]
    );
    const dispute = disputes[0];
    if (dispute.status !== "OPEN") throw new ApiError(409, "This dispute is already resolved");

    const contract = await getContract(conn, dispute.contract_id);

    await conn.execute(
      "UPDATE USERS SET held_amount = held_amount - ?, balance = balance + ? WHERE user_id = ?",
      [dispute.amount, dispute.amount, contract.poster_id]
    );

    // resolved_by points to USERS but admins live in ADMIN, so it stays NULL
    // and admin_id records who handled the dispute.
    await conn.execute(
      "UPDATE DISPUTE SET status = 'REFUNDED', admin_id = ? WHERE dispute_id = ?",
      [admin.id, id]
    );
    await conn.execute(
      `INSERT INTO TRANSACTION_LOG (contract_id, milestone_id, type, amount, from_user, to_user)
       VALUES (?, ?, 'REFUND', ?, ?, ?)`,
      [contract.contract_id, dispute.milestone_id, dispute.amount, contract.worker_id, contract.poster_id]
    );

    // The milestone stays FLAGGED: the schema has no REFUNDED milestone status.
    await updateContractAfterPayment(conn, contract);

    await conn.query("COMMIT");
    return ok({ message: "Refunded" });
  } catch (err) {
    if (conn) await conn.query("ROLLBACK");
    return handleError(err);
  } finally {
    if (conn) conn.release();
  }
}
