import pool from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

// All disputes for the admin dashboard, open ones first.
export async function GET() {
  try {
    await requireAdmin();
    const [disputes] = await pool.execute(
      `SELECT d.dispute_id, d.reason, d.status, m.title AS milestone, m.amount,
              t.title AS task_title, raiser.name AS raised_by,
              poster.name AS poster, worker.name AS worker, a.name AS handled_by
       FROM DISPUTE d
       JOIN MILESTONE m ON d.milestone_id = m.milestone_id
       JOIN CONTRACT c ON m.contract_id = c.contract_id
       JOIN BID b ON c.bid_id = b.bid_id
       JOIN TASK t ON b.task_id = t.task_id
       JOIN USERS raiser ON d.raised_by = raiser.user_id
       JOIN USERS poster ON t.poster_id = poster.user_id
       JOIN USERS worker ON b.bidder_id = worker.user_id
       LEFT JOIN ADMIN a ON d.admin_id = a.admin_id
       ORDER BY d.status = 'OPEN' DESC, d.dispute_id DESC`
    );
    return ok({ disputes });
  } catch (err) {
    return handleError(err);
  }
}
