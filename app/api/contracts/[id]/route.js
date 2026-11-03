import pool from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getContractForParty } from "@/lib/contracts";

// Everything on the contract page.
export async function GET(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const contract = await getContractForParty(pool, id, user.id);

    const [milestones] = await pool.execute(
      "SELECT * FROM MILESTONE WHERE contract_id = ? ORDER BY seq_no",
      [id]
    );
    const [transactions] = await pool.execute(
      `SELECT l.txn_id, l.type, l.amount, l.created_at, m.title AS milestone,
              f.name AS from_name, t.name AS to_name
       FROM TRANSACTION_LOG l
       JOIN USERS f ON l.from_user = f.user_id
       JOIN USERS t ON l.to_user = t.user_id
       LEFT JOIN MILESTONE m ON l.milestone_id = m.milestone_id
       WHERE l.contract_id = ?
       ORDER BY l.txn_id`,
      [id]
    );
    const [disputes] = await pool.execute(
      `SELECT d.dispute_id, d.reason, d.status, m.title AS milestone, u.name AS raised_by
       FROM DISPUTE d
       JOIN MILESTONE m ON d.milestone_id = m.milestone_id
       JOIN USERS u ON d.raised_by = u.user_id
       WHERE m.contract_id = ?
       ORDER BY d.dispute_id`,
      [id]
    );
    const [reviews] = await pool.execute(
      `SELECT r.review_id, r.reviewer_id, r.rating, r.comment, u.name AS reviewer
       FROM REVIEW r JOIN USERS u ON r.reviewer_id = u.user_id
       WHERE r.contract_id = ?`,
      [id]
    );
    const [[{ unallocated }]] = await pool.execute(
      `SELECT c.agreed_amount - COALESCE(SUM(m.amount), 0) AS unallocated
       FROM CONTRACT c LEFT JOIN MILESTONE m ON m.contract_id = c.contract_id
       WHERE c.contract_id = ?
       GROUP BY c.contract_id, c.agreed_amount`,
      [id]
    );

    return ok({
      contract,
      milestones,
      transactions,
      disputes,
      reviews,
      unallocated,
      role: contract.poster_id === user.id ? "POSTER" : "WORKER",
      userId: user.id,
    });
  } catch (err) {
    return handleError(err);
  }
}
