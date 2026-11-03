import { ApiError } from "./api";

// One contract with the people on it. db is the pool, or a connection inside a transaction.
export async function getContract(db, contractId) {
  const [rows] = await db.execute(
    `SELECT c.contract_id, c.agreed_amount, c.status, c.created_at,
            t.task_id, t.title, t.poster_id, b.bidder_id AS worker_id,
            up.name AS poster, uw.name AS worker
     FROM CONTRACT c
     JOIN BID b ON c.bid_id = b.bid_id
     JOIN TASK t ON b.task_id = t.task_id
     JOIN USERS up ON t.poster_id = up.user_id
     JOIN USERS uw ON b.bidder_id = uw.user_id
     WHERE c.contract_id = ?`,
    [contractId]
  );
  if (!rows[0]) throw new ApiError(404, "Contract not found");
  return rows[0];
}

// Only the poster and the worker may see or act on a contract.
export async function getContractForParty(db, contractId, userId) {
  const contract = await getContract(db, contractId);
  if (contract.poster_id !== userId && contract.worker_id !== userId) {
    throw new ApiError(403, "This is not your contract");
  }
  return contract;
}

// Runs inside a transaction, after money was released or refunded.
// When every rupee held for the contract has gone somewhere, the contract is
// closed. Otherwise it stays (or goes back to) ACTIVE.
export async function updateContractAfterPayment(conn, contract) {
  const [[totals]] = await conn.execute(
    `SELECT COALESCE(SUM(amount), 0) >= (SELECT agreed_amount FROM CONTRACT WHERE contract_id = ?) AS settled,
            COALESCE(SUM(type = 'RELEASE'), 0) > 0 AS any_released
     FROM TRANSACTION_LOG
     WHERE contract_id = ? AND type IN ('RELEASE', 'REFUND')`,
    [contract.contract_id, contract.contract_id]
  );

  if (!totals.settled) {
    await conn.execute("UPDATE CONTRACT SET status = 'ACTIVE' WHERE contract_id = ?", [contract.contract_id]);
  } else if (totals.any_released) {
    await conn.execute("UPDATE CONTRACT SET status = 'COMPLETED' WHERE contract_id = ?", [contract.contract_id]);
    await conn.execute("CALL sp_close_task(?)", [contract.task_id]);
  } else {
    // Everything was refunded, so no work was ever paid for.
    await conn.execute("UPDATE CONTRACT SET status = 'REFUNDED' WHERE contract_id = ?", [contract.contract_id]);
    await conn.execute("UPDATE TASK SET status = 'CANCELLED' WHERE task_id = ?", [contract.task_id]);
  }
}
