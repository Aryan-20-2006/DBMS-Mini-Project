-- Run this AFTER campus_task_board.sql, on a freshly loaded database.
-- It has three parts: schema changes, demo data repair, extra demo queries.

USE campus_task_board;


-- ============================================================================
-- PART 1: SCHEMA CHANGES
-- Login needs a stored password. Only the bcrypt hash is kept, never the
-- password itself. The column starts NULL because existing rows have no
-- password yet; it becomes NOT NULL once every row has one (end of Part 2).
-- ============================================================================

ALTER TABLE USERS ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE ADMIN ADD COLUMN password_hash VARCHAR(255) NULL;


-- ============================================================================
-- PART 2: DEMO DATA REPAIR
-- The demo section of campus_task_board.sql changes its own sample data, which
-- leaves no open task and a contract with no money held. These statements put
-- the data back into a state the app can demo. Data only, no structure changes.
-- ============================================================================

-- bid 3 was accepted with no contract: put it back so it can be accepted in the app
-- (the trigger only reacts to ACCEPTED, so this does not touch TASK)
UPDATE BID SET status = 'PENDING' WHERE bid_id = 3;
UPDATE TASK SET status = 'OPEN' WHERE task_id = 2;

-- contract 1 is ACTIVE for 450 but the money was never held: hold it now
UPDATE USERS SET balance = balance - 450.00, held_amount = held_amount + 450.00 WHERE user_id = 1;
INSERT INTO TRANSACTION_LOG (contract_id, milestone_id, type, amount, from_user, to_user)
VALUES (1, NULL, 'HOLD', 450.00, 1, 2);

-- the sample review was written before the work was finished: remove it so it
-- can be left properly in the app, and clear the rating it produced
DELETE FROM REVIEW WHERE review_id = 1;
UPDATE USERS SET avg_rating = 0 WHERE user_id = 2;

-- the sample dates have passed: move them forward from today
UPDATE TASK SET deadline = DATE_ADD(CURDATE(), INTERVAL 14 DAY);
UPDATE MILESTONE SET due_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY)  WHERE milestone_id = 1;
UPDATE MILESTONE SET due_date = DATE_ADD(CURDATE(), INTERVAL 14 DAY) WHERE milestone_id = 2;

-- every sample account logs in with the password: demo1234 (bcrypt hash below)
UPDATE USERS SET password_hash = '$2b$10$cKvnUQGdOVr8jjrgvYAKyuFo7Wlaume33lvw8ldjUr9jTc2Y5r9dK';
UPDATE ADMIN SET password_hash = '$2b$10$cKvnUQGdOVr8jjrgvYAKyuFo7Wlaume33lvw8ldjUr9jTc2Y5r9dK';

ALTER TABLE USERS MODIFY password_hash VARCHAR(255) NOT NULL;
ALTER TABLE ADMIN MODIFY password_hash VARCHAR(255) NOT NULL;


-- ============================================================================
-- PART 3: EXTRA DEMO QUERIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- DELETE
-- ---------------------------------------------------------------------------

-- clean up rejected bids on tasks that are already assigned. Wrapped in a
-- transaction and rolled back so this demo can be repeated without losing data.
START TRANSACTION;
DELETE FROM BID
WHERE status = 'REJECTED'
  AND task_id IN (SELECT task_id FROM TASK WHERE status = 'ASSIGNED');
SELECT bid_id, task_id, status FROM BID;   -- bid 2 is gone
ROLLBACK;
SELECT bid_id, task_id, status FROM BID;   -- bid 2 is back


-- ---------------------------------------------------------------------------
-- AGGREGATES
-- ---------------------------------------------------------------------------

-- total money in the system, split into spendable and held in escrow
SELECT SUM(balance) AS total_balance, SUM(held_amount) AS total_in_escrow FROM USERS;

-- bid statistics for each task
SELECT t.title, COUNT(b.bid_id) AS bids, MIN(b.amount) AS lowest, MAX(b.amount) AS highest,
       ROUND(AVG(b.amount), 2) AS average
FROM TASK t LEFT JOIN BID b ON t.task_id = b.task_id
GROUP BY t.task_id, t.title;

-- money moved, per transaction type
SELECT type, COUNT(*) AS transactions, SUM(amount) AS total
FROM TRANSACTION_LOG
GROUP BY type;


-- ---------------------------------------------------------------------------
-- GROUP BY with HAVING
-- ---------------------------------------------------------------------------

-- tasks that attracted more than one bid
SELECT t.task_id, t.title, COUNT(*) AS bid_count
FROM TASK t JOIN BID b ON t.task_id = b.task_id
GROUP BY t.task_id, t.title
HAVING COUNT(*) > 1;

-- categories with more than 400 of total budget posted
SELECT c.name AS category, COUNT(*) AS tasks, SUM(t.budget) AS total_budget
FROM CATEGORY c JOIN TASK t ON c.category_id = t.category_id
GROUP BY c.category_id, c.name
HAVING SUM(t.budget) > 400;

-- students who have bid at least 1 time, with their average bid
SELECT u.name, COUNT(*) AS bids_placed, ROUND(AVG(b.amount), 2) AS average_bid
FROM USERS u JOIN BID b ON u.user_id = b.bidder_id
GROUP BY u.user_id, u.name
HAVING COUNT(*) >= 1;


-- ---------------------------------------------------------------------------
-- SUBQUERIES
-- ---------------------------------------------------------------------------

-- scalar subquery: tasks with a budget above the average budget
SELECT title, budget FROM TASK
WHERE budget > (SELECT AVG(budget) FROM TASK);

-- NOT IN subquery: students who have never placed a bid
SELECT name FROM USERS
WHERE user_id NOT IN (SELECT bidder_id FROM BID);

-- correlated subquery: the lowest bid on each task
SELECT b.task_id, b.bid_id, b.amount
FROM BID b
WHERE b.amount = (SELECT MIN(b2.amount) FROM BID b2 WHERE b2.task_id = b.task_id);

-- EXISTS subquery: contracts that have at least one milestone still to approve
SELECT c.contract_id, c.agreed_amount
FROM CONTRACT c
WHERE EXISTS (SELECT 1 FROM MILESTONE m
              WHERE m.contract_id = c.contract_id AND m.status <> 'APPROVED');

-- subquery in FROM: how much of each contract is still held in escrow
SELECT c.contract_id, c.agreed_amount,
       c.agreed_amount - COALESCE(paid.total, 0) AS still_held
FROM CONTRACT c
LEFT JOIN (SELECT contract_id, SUM(amount) AS total
           FROM TRANSACTION_LOG
           WHERE type IN ('RELEASE', 'REFUND')
           GROUP BY contract_id) paid ON c.contract_id = paid.contract_id;
