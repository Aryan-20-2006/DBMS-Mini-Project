import { getDb } from "./mongo";

// Called after COMMIT. MySQL and MongoDB cannot share one transaction, and the
// money has already moved, so a MongoDB failure is logged instead of failing the request.
export async function notify(userId, type, message, link) {
  try {
    await getDb().collection("notifications").insertOne({
      user_id: userId,
      type,
      message,
      link,
      read: false,
      created_at: new Date(),
    });
  } catch (err) {
    console.error("Could not save notification:", err.message);
  }
}
