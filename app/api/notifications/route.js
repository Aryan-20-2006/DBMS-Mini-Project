import { handleError, ok } from "@/lib/api";
import { requireStudent } from "@/lib/auth";
import { getDb } from "@/lib/mongo";

// My notifications, newest first.
export async function GET() {
  try {
    const user = await requireStudent();
    const notifications = await getDb()
      .collection("notifications")
      .find({ user_id: user.id })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    return ok({ notifications });
  } catch (err) {
    return handleError(err);
  }
}

// Mark all of mine as read.
export async function POST() {
  try {
    const user = await requireStudent();
    await getDb()
      .collection("notifications")
      .updateMany({ user_id: user.id, read: false }, { $set: { read: true } });
    return ok({ message: "Marked as read" });
  } catch (err) {
    return handleError(err);
  }
}
