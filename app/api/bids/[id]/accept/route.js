import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { notify } from "@/lib/notify";

// Accept a bid: moves the money into escrow and creates the contract.
// All the changes commit together, or none of them happen.
export async function POST(request, { params }) {
  let conn;
  try {
    const user = await requireStudent();
    const { id } = await params;

    conn = await pool.getConnection();
    await conn.query("START TRANSACTION");

    // Lock the poster first. Any other money action for this poster now waits
    // here, so two clicks cannot both spend the same balance.
    const [[poster]] = await conn.execute(
      "SELECT balance FROM USERS WHERE user_id = ? FOR UPDATE",
      [user.id]
    );

    const [bids] = await conn.execute(
      `SELECT b.bid_id, b.task_id, b.bidder_id, b.amount, b.status,
              t.poster_id, t.title, t.status AS task_status
       FROM BID b JOIN TASK t ON b.task_id = t.task_id
       WHERE b.bid_id = ? FOR UPDATE`,
      [id]
    );
    const bid = bids[0];
    if (!bid) throw new ApiError(404, "Bid not found");
    if (bid.poster_id !== user.id) throw new ApiError(403, "Only the task poster can accept a bid");
    if (bid.task_status !== "OPEN" || bid.status !== "PENDING") {
      throw new ApiError(409, "This bid can no longer be accepted");
    }
    if (Number(poster.balance) < Number(bid.amount)) {
      throw new ApiError(400, "You do not have enough balance to accept this bid");
    }

    await conn.execute(
      "UPDATE USERS SET balance = balance - ?, held_amount = held_amount + ? WHERE user_id = ?",
      [bid.amount, bid.amount, user.id]
    );

    // trg_task_assigned_on_accept fires here and sets the task to ASSIGNED.
    await conn.execute("UPDATE BID SET status = 'ACCEPTED' WHERE bid_id = ?", [bid.bid_id]);
    await conn.execute(
      "UPDATE BID SET status = 'REJECTED' WHERE task_id = ? AND bid_id <> ? AND status = 'PENDING'",
      [bid.task_id, bid.bid_id]
    );

    const [contract] = await conn.execute(
      "INSERT INTO CONTRACT (bid_id, agreed_amount) VALUES (?, ?)",
      [bid.bid_id, bid.amount]
    );

    // milestone_id is NULL: the first HOLD covers the whole contract.
    await conn.execute(
      `INSERT INTO TRANSACTION_LOG (contract_id, milestone_id, type, amount, from_user, to_user)
       VALUES (?, NULL, 'HOLD', ?, ?, ?)`,
      [contract.insertId, bid.amount, user.id, bid.bidder_id]
    );

    await conn.query("COMMIT");

    await notify(
      bid.bidder_id,
      "BID_ACCEPTED",
      `Your bid of ₹${bid.amount} on "${bid.title}" was accepted`,
      `/contracts/${contract.insertId}`
    );
    return ok({ contract_id: contract.insertId });
  } catch (err) {
    if (conn) await conn.query("ROLLBACK");
    return handleError(err);
  } finally {
    if (conn) conn.release();
  }
}
