import { ApiError, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new ApiError(401, "Please log in");
    return ok({ id: session.id, name: session.name, role: session.role });
  } catch (err) {
    return handleError(err);
  }
}
