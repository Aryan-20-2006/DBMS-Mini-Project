CREATE DATABASE IF NOT EXISTS campus_task_board;
USE campus_task_board;

-- DDL: drop in reverse dependency order to avoid FK errors

DROP TABLE IF EXISTS TRANSACTION_LOG;
DROP TABLE IF EXISTS DISPUTE;
DROP TABLE IF EXISTS REVIEW;
DROP TABLE IF EXISTS MILESTONE;
DROP TABLE IF EXISTS CONTRACT;
DROP TABLE IF EXISTS BID;
DROP TABLE IF EXISTS TASK;
DROP TABLE IF EXISTS CATEGORY;
DROP TABLE IF EXISTS ADMIN;
DROP TABLE IF EXISTS USERS;

-- 'USER' and 'TRANSACTION' are reserved words in most SQL engines,
-- hence USERS / TRANSACTION_LOG

CREATE TABLE USERS (
    user_id      INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    srn          VARCHAR(20)  NOT NULL UNIQUE,
    department   VARCHAR(50),
    role         ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
    avg_rating   DECIMAL(3,2)  NOT NULL DEFAULT 0,        -- derived, updated from REVIEW
    balance      DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    held_amount  DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (held_amount >= 0)  -- money in escrow
);
DESC USERS;

CREATE TABLE ADMIN (
    admin_id     INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    role         VARCHAR(50) DEFAULT 'MODERATOR'
);
DESC ADMIN;

CREATE TABLE CATEGORY (
    category_id  INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(50) NOT NULL UNIQUE
);
DESC CATEGORY;

CREATE TABLE TASK (
    task_id      INT AUTO_INCREMENT PRIMARY KEY,
    poster_id    INT NOT NULL,
    category_id  INT,
    title        VARCHAR(150) NOT NULL,
    description  TEXT,
    budget       DECIMAL(10,2) NOT NULL CHECK (budget > 0),
    deadline     DATE,
    status       ENUM('OPEN','ASSIGNED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'OPEN',
    FOREIGN KEY (poster_id)   REFERENCES USERS(user_id),
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id)
);
DESC TASK;

CREATE TABLE BID (
    bid_id       INT AUTO_INCREMENT PRIMARY KEY,
    task_id      INT NOT NULL,
    bidder_id    INT NOT NULL,
    amount       DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    proposal     TEXT,
    status       ENUM('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (task_id)   REFERENCES TASK(task_id),
    FOREIGN KEY (bidder_id) REFERENCES USERS(user_id),
    UNIQUE (task_id, bidder_id)   -- one bid per student per task
);
DESC BID;

CREATE TABLE CONTRACT (
    contract_id    INT AUTO_INCREMENT PRIMARY KEY,
    bid_id         INT NOT NULL UNIQUE,   -- UNIQUE turns this 1:N FK into a 1:1
    agreed_amount  DECIMAL(10,2) NOT NULL,
    status         ENUM('ACTIVE','COMPLETED','DISPUTED','REFUNDED') NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bid_id) REFERENCES BID(bid_id)
);
DESC CONTRACT;

CREATE TABLE REVIEW (
    review_id     INT AUTO_INCREMENT PRIMARY KEY,
    contract_id   INT NOT NULL,
    reviewer_id   INT NOT NULL,   -- FK -> USERS, person giving the review
    reviewee_id   INT NOT NULL,   -- FK -> USERS, person being reviewed
    rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    FOREIGN KEY (contract_id) REFERENCES CONTRACT(contract_id),
    FOREIGN KEY (reviewer_id) REFERENCES USERS(user_id),
    FOREIGN KEY (reviewee_id) REFERENCES USERS(user_id),
    UNIQUE (contract_id, reviewer_id)   -- one review per person per contract
);
DESC REVIEW;

CREATE TABLE MILESTONE (
    milestone_id  INT AUTO_INCREMENT PRIMARY KEY,   -- surrogate key, simpler than a composite
    contract_id   INT NOT NULL,
    seq_no        INT NOT NULL,
    title         VARCHAR(100) NOT NULL,
    amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date      DATE,
    status        ENUM('PENDING','SUBMITTED','APPROVED','FLAGGED') NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (contract_id) REFERENCES CONTRACT(contract_id),
    UNIQUE (contract_id, seq_no)   -- step 1, 2, 3... within one contract
);
DESC MILESTONE;

CREATE TABLE DISPUTE (
    dispute_id    INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id  INT NOT NULL,
    raised_by     INT NOT NULL,   -- FK -> USERS, student who filed it
    resolved_by   INT,            -- FK -> USERS, nullable until settled
    admin_id      INT,            -- FK -> ADMIN, who actually handled it
    reason        TEXT NOT NULL,
    status        ENUM('OPEN','REFUNDED','REJECTED') NOT NULL DEFAULT 'OPEN',
    FOREIGN KEY (milestone_id) REFERENCES MILESTONE(milestone_id),
    FOREIGN KEY (raised_by)    REFERENCES USERS(user_id),
    FOREIGN KEY (resolved_by)  REFERENCES USERS(user_id),
    FOREIGN KEY (admin_id)     REFERENCES ADMIN(admin_id)
);
DESC DISPUTE;

CREATE TABLE TRANSACTION_LOG (
    txn_id        INT AUTO_INCREMENT PRIMARY KEY,
    contract_id   INT NOT NULL,
    milestone_id  INT,   -- nullable: the initial HOLD has no milestone yet
    type          ENUM('HOLD','RELEASE','REFUND') NOT NULL,
    amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    from_user     INT NOT NULL,
    to_user       INT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id)  REFERENCES CONTRACT(contract_id),
    FOREIGN KEY (milestone_id) REFERENCES MILESTONE(milestone_id),
    FOREIGN KEY (from_user)    REFERENCES USERS(user_id),
    FOREIGN KEY (to_user)      REFERENCES USERS(user_id)
);
DESC TRANSACTION_LOG;


-- DML: sample data

INSERT INTO USERS (name, email, srn, department, role, balance, held_amount) VALUES
('Aryan Sharma', 'aryan@pes.edu', 'PES2UG24CS088', 'CSE', 'STUDENT', 1000.00, 0.00),
('Diya Rao',     'diya@pes.edu',  'PES2UG24CS045', 'CSE', 'STUDENT',  500.00, 0.00),
('Kabir Mehta',  'kabir@pes.edu', 'PES2UG24EC012', 'ECE', 'STUDENT',  300.00, 0.00);

INSERT INTO ADMIN (name, email, role) VALUES
('Prof. Nandini Iyer', 'nandini.admin@pes.edu', 'MODERATOR');

INSERT INTO CATEGORY (name) VALUES
('Poster Design'), ('Video Editing'), ('Coding Help'), ('Event Assistance');

INSERT INTO TASK (poster_id, category_id, title, description, budget, deadline, status) VALUES
(1, 1, 'Cultural fest poster', 'A3 poster for the annual cultural fest', 500.00, '2026-10-05', 'ASSIGNED'),
(2, 3, 'Debug a Flask app',    'Fix a login bug in a small Flask project', 300.00, '2026-10-02', 'OPEN');

INSERT INTO BID (task_id, bidder_id, amount, proposal, status) VALUES
(1, 2, 450.00, 'I can start today, 2 revisions included', 'ACCEPTED'),
(1, 3, 480.00, 'I have poster design experience',          'REJECTED'),
(2, 3, 280.00, 'I know Flask auth well',                    'PENDING');

-- bid 1 (Diya's bid on Aryan's poster task) was accepted -> becomes a contract
INSERT INTO CONTRACT (bid_id, agreed_amount, status) VALUES
(1, 450.00, 'ACTIVE');

INSERT INTO MILESTONE (contract_id, seq_no, title, amount, due_date, status) VALUES
(1, 1, 'Draft poster', 200.00, '2026-10-02', 'PENDING'),
(1, 2, 'Final poster', 250.00, '2026-10-05', 'PENDING');


-- ============================================================================
-- PHASE 2: ADVANCED DATABASE FEATURES
-- Four concepts are demonstrated below (the brief asks for at least four):
-- Views, Functions, Stored Procedures, and Triggers — two each of
-- functions, procedures and triggers.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- VIEWS
-- Why: the app's two most common screens are "what contracts are live right
-- now" and "what does a user's wallet look like." Both need a multi-table
-- JOIN every time they're queried. A view saves that JOIN under a name, so
-- the frontend (or a demo query) can just SELECT from it like a table
-- instead of repeating the JOIN logic everywhere it's needed.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_active_contracts AS
SELECT
    c.contract_id,
    t.title        AS task_title,
    up.name         AS poster,
    uw.name         AS worker,
    c.agreed_amount,
    c.status
FROM CONTRACT c
JOIN BID  b  ON c.bid_id      = b.bid_id
JOIN TASK t  ON b.task_id     = t.task_id
JOIN USERS up ON t.poster_id  = up.user_id
JOIN USERS uw ON b.bidder_id  = uw.user_id
WHERE c.status = 'ACTIVE';

CREATE OR REPLACE VIEW vw_user_wallet AS
SELECT user_id, name, balance, held_amount, avg_rating
FROM USERS;


-- ---------------------------------------------------------------------------
-- FUNCTIONS
-- Why: two small, reusable, read-only one-liners — no branching, no
-- multi-step logic. Each answers a single question that would otherwise be
-- a repeated inline SELECT.
-- ---------------------------------------------------------------------------

DELIMITER $$

-- a user's average rating, straight off REVIEW; 0 if they have none yet
CREATE FUNCTION fn_avg_rating(p_user_id INT)
RETURNS DECIMAL(3,2)
READS SQL DATA
BEGIN
    RETURN (SELECT COALESCE(ROUND(AVG(rating), 2), 0.00)
            FROM REVIEW WHERE reviewee_id = p_user_id);
END$$

-- how many days are left until a task's deadline (negative = overdue)
CREATE FUNCTION fn_days_left(p_task_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    RETURN (SELECT DATEDIFF(deadline, CURDATE()) FROM TASK WHERE task_id = p_task_id);
END$$

DELIMITER ;


-- ---------------------------------------------------------------------------
-- STORED PROCEDURES
-- Why: each procedure does exactly one job end to end, so it's easy to
-- explain what it does and why it's a procedure rather than a function
-- (it changes data / returns a multi-column result set, which a function
-- can't do).
-- ---------------------------------------------------------------------------

DELIMITER $$

-- marks a task COMPLETED in one call, instead of writing the UPDATE by hand
-- every time a contract wraps up
CREATE PROCEDURE sp_close_task(IN p_task_id INT)
BEGIN
    UPDATE TASK SET status = 'COMPLETED' WHERE task_id = p_task_id;
END$$

-- a one-stop "profile card" for a user: wallet + how many bids they've placed,
-- pulled with a single CALL instead of two separate queries
CREATE PROCEDURE sp_get_user_summary(IN p_user_id INT)
BEGIN
    SELECT u.user_id, u.name, u.balance, u.held_amount, u.avg_rating,
           (SELECT COUNT(*) FROM BID WHERE bidder_id = u.user_id) AS bids_placed
    FROM USERS u
    WHERE u.user_id = p_user_id;
END$$

DELIMITER ;


-- ---------------------------------------------------------------------------
-- TRIGGERS
-- Why: each is a single automatic consequence of a change on another table
-- — one UPDATE each, no loops or multi-table joins inside the trigger body.
-- ---------------------------------------------------------------------------

DELIMITER $$

-- the moment a review is inserted, refresh the reviewee's stored avg_rating
CREATE TRIGGER trg_avg_rating_after_review
AFTER INSERT ON REVIEW
FOR EACH ROW
BEGIN
    UPDATE USERS
    SET avg_rating = fn_avg_rating(NEW.reviewee_id)
    WHERE user_id = NEW.reviewee_id;
END$$

-- the moment a bid is marked ACCEPTED, its task flips to ASSIGNED on its own
CREATE TRIGGER trg_task_assigned_on_accept
AFTER UPDATE ON BID
FOR EACH ROW
BEGIN
    IF NEW.status = 'ACCEPTED' THEN
        UPDATE TASK SET status = 'ASSIGNED' WHERE task_id = NEW.task_id;
    END IF;
END$$

DELIMITER ;


-- ---------------------------------------------------------------------------
-- DEMO: exercising the functions, procedures and triggers above against the
-- existing sample data — no new rows needed.
-- ---------------------------------------------------------------------------

-- functions
SELECT fn_avg_rating(2)     AS diya_avg_rating_before_any_review;
SELECT fn_days_left(2)      AS days_left_on_flask_task;

-- procedures
CALL sp_get_user_summary(1);         -- Aryan's wallet + bid count
CALL sp_close_task(2);                -- mark the Flask task COMPLETED directly
SELECT task_id, status FROM TASK WHERE task_id = 2;

-- trigger 1: accepting bid 3 should flip task 2 back to ASSIGNED automatically
UPDATE BID SET status = 'ACCEPTED' WHERE bid_id = 3;
SELECT task_id, status FROM TASK WHERE task_id = 2;   -- expect ASSIGNED (trigger, not sp_close_task)

-- trigger 2: inserting a review recalculates avg_rating automatically
INSERT INTO REVIEW (contract_id, reviewer_id, reviewee_id, rating, comment)
VALUES (1, 1, 2, 5, 'Delivered the poster on time, great quality');

SELECT user_id, name, avg_rating FROM USERS WHERE user_id = 2;   -- expect 5.00

-- views: query like ordinary tables
SELECT * FROM vw_active_contracts;
SELECT * FROM vw_user_wallet;


-- ============================================================================
-- Demo queries
-- ============================================================================

-- bids on a task, cheapest first
SELECT b.bid_id, u.name AS bidder, b.amount, b.status
FROM BID b JOIN USERS u ON b.bidder_id = u.user_id
WHERE b.task_id = 1
ORDER BY b.amount;

-- money currently sitting in escrow, per user
SELECT user_id, name, held_amount FROM USERS WHERE held_amount > 0;

-- average rating per user, computed live from REVIEW (not the stored avg_rating column)
SELECT u.user_id, u.name, ROUND(AVG(r.rating), 2) AS computed_avg_rating
FROM USERS u JOIN REVIEW r ON u.user_id = r.reviewee_id
GROUP BY u.user_id, u.name;

-- milestones for one contract, in delivery order
SELECT seq_no, title, amount, status FROM MILESTONE WHERE contract_id = 1 ORDER BY seq_no;

-- disputes each admin has closed
SELECT d.dispute_id, d.reason, d.status, a.name AS handled_by
FROM DISPUTE d JOIN ADMIN a ON d.admin_id = a.admin_id;






