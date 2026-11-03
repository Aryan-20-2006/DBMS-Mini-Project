import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";

// The worker marks a milestone as done, so the poster can approve it. No money moves.
export async function POST(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;

    // The WHERE clause does all the checks in one statement: right worker,
    // milestone still PENDING, contract still ACTIVE.
    const [result] = await pool.execute(
      `UPDATE MILESTONE m
       JOIN CONTRACT c ON m.contract_id = c.contract_id
       JOIN BID b ON c.bid_id = b.bid_id
       SET m.status = 'SUBMITTED'
       WHERE m.milestone_id = ? AND b.bidder_id = ?
         AND m.status = 'PENDING' AND c.status = 'ACTIVE'`,
      [id, user.id]
    );
    if (result.affectedRows === 0) {
      throw new ApiError(409, "This milestone cannot be submitted");
    }
    return ok({ message: "Submitted" });
  } catch (err) {
    return handleError(err);
  }
}
