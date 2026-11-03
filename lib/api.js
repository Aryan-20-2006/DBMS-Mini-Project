import { NextResponse } from "next/server";

// An error we expect (bad input, no permission). Its message is shown to the user.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function ok(data, status = 200) {
  return NextResponse.json(data, { status });
}

// Every route handler ends its catch block with this.
export function handleError(err) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

// Amounts must be positive with at most 2 decimals, to fit DECIMAL(10,2).
export function parseAmount(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
    throw new ApiError(400, "Enter a valid amount greater than 0");
  }
  return text;
}
