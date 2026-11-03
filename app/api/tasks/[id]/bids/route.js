import pool from "@/lib/db";
import { ApiError, handleError, ok, parseAmount } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { notify } from "@/lib/notify";

// Place a bid on an open task.
export async function POST(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const { amount, proposal } = await request.json();
    const bidAmount = parseAmount(amount);

    const [tasks] = await pool.execute(
      "SELECT poster_id, title, budget, status FROM TASK WHERE task_id = ?",
      [id]
    );
    const task = tasks[0];
    if (!task) throw new ApiError(404, "Task not found");
    if (task.status !== "OPEN") throw new ApiError(409, "This task is no longer open");
    if (task.poster_id === user.id) throw new ApiError(403, "You cannot bid on your own task");
    if (Number(bidAmount) > Number(task.budget)) {
      throw new ApiError(400, "Your bid cannot be more than the task budget");
    }

    const [result] = await pool.execute(
      "INSERT INTO BID (task_id, bidder_id, amount, proposal) VALUES (?, ?, ?, ?)",
      [id, user.id, bidAmount, proposal?.trim() || null]
    );
    await notify(
      task.poster_id,
      "NEW_BID",
      `${user.name} bid ₹${bidAmount} on "${task.title}"`,
      `/tasks/${id}`
    );
    return ok({ bid_id: result.insertId }, 201);
  } catch (err) {
    // UNIQUE (task_id, bidder_id) in the schema enforces one bid per student per task.
    if (err.code === "ER_DUP_ENTRY") {
      return handleError(new ApiError(409, "You have already bid on this task"));
    }
    return handleError(err);
  }
}
