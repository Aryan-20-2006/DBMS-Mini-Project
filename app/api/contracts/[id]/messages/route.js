import pool from "@/lib/db";
import { ApiError, handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getContractForParty } from "@/lib/contracts";
import { getDb } from "@/lib/mongo";

// Chat lives in MongoDB, but MySQL decides who may read it: only the contract's two people.
export async function GET(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    await getContractForParty(pool, id, user.id);

    const messages = await getDb()
      .collection("messages")
      .find({ contract_id: Number(id) })
      .sort({ created_at: 1 })
      .toArray();
    return ok({ messages });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request, { params }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const { text } = await request.json();

    if (!text?.trim()) throw new ApiError(400, "Type a message first");
    if (text.length > 1000) throw new ApiError(400, "That message is too long");
    await getContractForParty(pool, id, user.id);

    await getDb().collection("messages").insertOne({
      contract_id: Number(id),
      sender_id: user.id,
      sender_name: user.name,
      text: text.trim(),
      created_at: new Date(),
    });
    return ok({ message: "Sent" }, 201);
  } catch (err) {
    return handleError(err);
  }
}
