import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";

// One task with its bids. The poster sees every bid, anyone else only their own.
export async function GET(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;

    const [tasks] = await pool.execute(
      `SELECT t.*, c.name AS category, u.name AS poster, fn_days_left(t.task_id) AS days_left
       FROM TASK t
       JOIN USERS u ON t.poster_id = u.user_id
       LEFT JOIN CATEGORY c ON t.category_id = c.category_id
       WHERE t.task_id = ?`,
      [id]
    );
    const task = tasks[0];
    if (!task) throw new ApiError(404, "Task not found");

    const isPoster = task.poster_id === user.id;
    const [bids] = await pool.execute(
      `SELECT b.bid_id, b.bidder_id, b.amount, b.proposal, b.status,
              u.name AS bidder, u.avg_rating, c.contract_id
       FROM BID b
       JOIN USERS u ON b.bidder_id = u.user_id
       LEFT JOIN CONTRACT c ON c.bid_id = b.bid_id
       WHERE b.task_id = ? AND (? OR b.bidder_id = ?)
       ORDER BY b.amount`,
      [id, isPoster ? 1 : 0, user.id]
    );
    return ok({ task, bids, isPoster });
  } catch (err) {
    return handleError(err);
  }
}
