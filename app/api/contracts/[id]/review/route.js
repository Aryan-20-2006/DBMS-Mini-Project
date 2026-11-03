import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getContractForParty } from "@/lib/contracts";

// Leave a review of the other person once a contract is closed.
// trg_avg_rating_after_review then updates their avg_rating automatically.
export async function POST(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const { rating, comment } = await request.json();

    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new ApiError(400, "Rating must be from 1 to 5");
    }

    const contract = await getContractForParty(pool, id, user.id);
    if (contract.status !== "COMPLETED" && contract.status !== "REFUNDED") {
      throw new ApiError(409, "You can review once the contract is closed");
    }
    const revieweeId = contract.poster_id === user.id ? contract.worker_id : contract.poster_id;

    await pool.execute(
      "INSERT INTO REVIEW (contract_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
      [id, user.id, revieweeId, stars, comment?.trim() || null]
    );
    return ok({ message: "Review saved" }, 201);
  } catch (err) {
    // UNIQUE (contract_id, reviewer_id) allows one review per person per contract.
    if (err.code === "ER_DUP_ENTRY") {
      return handleError(new ApiError(409, "You have already reviewed this contract"));
    }
    return handleError(err);
  }
}
