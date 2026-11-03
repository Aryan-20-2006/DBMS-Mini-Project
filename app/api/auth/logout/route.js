import { handleError, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ message: "Logged out" });
  } catch (err) {
    return handleError(err);
  }
}
