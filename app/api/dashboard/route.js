import pool from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";

// Everything on the dashboard page. Uses the view, procedure and function
// from campus_task_board.sql instead of repeating their SQL here.
export async function GET() {
  try {
    const user = await requireStudent();

    const [wallet] = await pool.execute("SELECT * FROM vw_user_wallet WHERE user_id = ?", [user.id]);
    // A CALL returns a list of result sets; the first one holds the summary row.
    const [summary] = await pool.execute("CALL sp_get_user_summary(?)", [user.id]);
    const [[{ live_rating }]] = await pool.execute(
      "SELECT fn_avg_rating(?) AS live_rating",
      [user.id]
    );

    const [myTasks] = await pool.execute(
      `SELECT t.task_id, t.title, t.budget, t.deadline, t.status,
              (SELECT COUNT(*) FROM BID b WHERE b.task_id = t.task_id) AS bid_count
       FROM TASK t WHERE t.poster_id = ? ORDER BY t.task_id DESC`,
      [user.id]
    );
    const [myBids] = await pool.execute(
      `SELECT b.bid_id, b.amount, b.status, t.task_id, t.title, c.contract_id
       FROM BID b
       JOIN TASK t ON b.task_id = t.task_id
       LEFT JOIN CONTRACT c ON c.bid_id = b.bid_id
       WHERE b.bidder_id = ? ORDER BY b.bid_id DESC`,
      [user.id]
    );

    // The view only has names, and names are not unique, so it is joined back
    // on contract_id to find this user's contracts.
    const [activeContracts] = await pool.execute(
      `SELECT v.*
       FROM vw_active_contracts v
       JOIN CONTRACT c ON v.contract_id = c.contract_id
       JOIN BID b ON c.bid_id = b.bid_id
       JOIN TASK t ON b.task_id = t.task_id
       WHERE t.poster_id = ? OR b.bidder_id = ?`,
      [user.id, user.id]
    );
    // The view hides anything not ACTIVE, so finished and disputed contracts need their own query.
    const [otherContracts] = await pool.execute(
      `SELECT c.contract_id, t.title AS task_title, up.name AS poster, uw.name AS worker,
              c.agreed_amount, c.status
       FROM CONTRACT c
       JOIN BID b ON c.bid_id = b.bid_id
       JOIN TASK t ON b.task_id = t.task_id
       JOIN USERS up ON t.poster_id = up.user_id
       JOIN USERS uw ON b.bidder_id = uw.user_id
       WHERE c.status <> 'ACTIVE' AND (t.poster_id = ? OR b.bidder_id = ?)`,
      [user.id, user.id]
    );

    return ok({
      wallet: wallet[0],
      summary: summary[0][0],
      liveRating: live_rating,
      myTasks,
      myBids,
      activeContracts,
      otherContracts,
    });
  } catch (err) {
    return handleError(err);
  }
}
