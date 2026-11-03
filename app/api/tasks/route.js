import pool from "@/lib/db";
import { ApiError, handleError, ok, parseAmount } from "@/lib/api";
import { requireStudent } from "@/lib/auth";

// Browse open tasks, with optional filters. fn_days_left comes from the SQL file.
export async function GET(request) {
  try {
    await requireStudent();
    const params = request.nextUrl.searchParams;
    const conditions = ["t.status = 'OPEN'"];
    const values = [];

    if (params.get("category")) {
      conditions.push("t.category_id = ?");
      values.push(params.get("category"));
    }
    if (params.get("search")) {
      conditions.push("t.title LIKE ?");
      values.push(`%${params.get("search")}%`);
    }
    if (params.get("maxBudget")) {
      conditions.push("t.budget <= ?");
      values.push(parseAmount(params.get("maxBudget")));
    }

    // Only fixed text goes into the SQL string; user input stays in the ? values.
    const [tasks] = await pool.execute(
      `SELECT t.task_id, t.title, t.budget, t.deadline, c.name AS category, u.name AS poster,
              fn_days_left(t.task_id) AS days_left,
              (SELECT COUNT(*) FROM BID b WHERE b.task_id = t.task_id) AS bid_count
       FROM TASK t
       JOIN USERS u ON t.poster_id = u.user_id
       LEFT JOIN CATEGORY c ON t.category_id = c.category_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY t.deadline`,
      values
    );
    const [categories] = await pool.execute(
      "SELECT category_id, name FROM CATEGORY ORDER BY name"
    );
    return ok({ tasks, categories });
  } catch (err) {
    return handleError(err);
  }
}

// Post a new task.
export async function POST(request) {
  try {
    const user = await requireStudent();
    const { title, description, budget, deadline, category_id } = await request.json();

    if (!title?.trim()) throw new ApiError(400, "Title is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline ?? "")) throw new ApiError(400, "Choose a deadline");
    const amount = parseAmount(budget);

    const [[{ is_future }]] = await pool.execute(
      "SELECT ? >= CURDATE() AS is_future",
      [deadline]
    );
    if (!is_future) throw new ApiError(400, "The deadline cannot be in the past");

    const [result] = await pool.execute(
      `INSERT INTO TASK (poster_id, category_id, title, description, budget, deadline)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, category_id || null, title.trim(), description?.trim() || null, amount, deadline]
    );
    return ok({ task_id: result.insertId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
