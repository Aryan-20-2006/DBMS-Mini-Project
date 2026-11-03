# Campus Task Board

A peer-to-peer student task marketplace. Students post paid tasks, others bid, and payment is held in escrow and released milestone by milestone. An admin can resolve disputes with a refund. The money is simulated.

**Team 4:** Aryan Burman (PES2UG24CS088), Atharva Singh (PES2UG24CS095)

**Stack:** Next.js (App Router, Route Handlers), MySQL 8 (`mysql2`), MongoDB, `bcryptjs`, `jose` (JWT)

## Setup

You need Node.js 20 or newer, MySQL 8 and MongoDB, with both database services running. Run these in PowerShell from the project folder.

**1. Install packages**

```powershell
npm install
```

**2. Create your settings file** (skip this if `.env.local` already exists, because this command overwrites it)

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local`, set `DB_PASSWORD` to your MySQL password and `JWT_SECRET` to any long random string.

**3. Load the database** (enter your MySQL password each time)

```powershell
mysql -u root -p -e "DROP DATABASE IF EXISTS campus_task_board"
mysql -u root -p -e "source campus_task_board.sql"
mysql -u root -p -e "source alter_and_queries.sql"
```

The first command deletes any existing `campus_task_board` database. It is needed because `campus_task_board.sql` cannot be re-run while its functions already exist.

If `mysql` is not recognised, use the full path: `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`.

**4. Start the app**

```powershell
npm run dev
```

Open http://localhost:3000.

## Sample accounts

All use the password `demo1234`.

| Email | Role | Starting state |
|---|---|---|
| `aryan@pes.edu` | Student | ₹550 available, ₹450 held for contract 1 (poster) |
| `diya@pes.edu` | Student | ₹500 available, worker on contract 1, poster of the open Flask task |
| `kabir@pes.edu` | Student | ₹300 available, has a pending bid on the Flask task |
| `nandini.admin@pes.edu` | Admin | Resolves disputes |

New students start with a balance of 0 and there is no top-up feature, so use Aryan or Diya to demo accepting a bid.

## Resetting before a demo

Run the three commands from step 3, then clear chat and notifications:

```powershell
mongosh campus_task_board --quiet --eval "db.dropDatabase()"
```

## How the database objects are used

| Object | Where |
|---|---|
| `vw_user_wallet` | Wallet on the dashboard |
| `vw_active_contracts` | Active contracts on the dashboard |
| `sp_get_user_summary` | Bids placed on the dashboard |
| `sp_close_task` | Closes the task when a contract completes |
| `fn_days_left` | Days left on the browse and task pages |
| `fn_avg_rating` | Live rating on the dashboard |
| `trg_task_assigned_on_accept` | Sets the task to ASSIGNED when a bid is accepted |
| `trg_avg_rating_after_review` | Updates the stored rating when a review is added |

## How the money moves

Each step runs in one MySQL transaction, in its route handler: `START TRANSACTION`, then `SELECT ... FOR UPDATE` on the poster's row, then the checks and updates, then `COMMIT`. Any error causes a `ROLLBACK`.

| Action | File | Money | Log row |
|---|---|---|---|
| Accept bid | `app/api/bids/[id]/accept/route.js` | poster `balance` → poster `held_amount` | HOLD |
| Approve milestone | `app/api/milestones/[id]/approve/route.js` | poster `held_amount` → worker `balance` | RELEASE |
| Refund dispute | `app/api/admin/disputes/[id]/refund/route.js` | poster `held_amount` → poster `balance` | REFUND |

`from_user` and `to_user` cannot be NULL and escrow is not a user, so HOLD and RELEASE are logged poster → worker, and REFUND is logged worker → poster.

A contract closes when released plus refunded money equals the agreed amount: `COMPLETED` if anything was released, `REFUNDED` if everything was refunded.

MySQL and MongoDB cannot share a transaction, so notifications are written after `COMMIT`. If MongoDB is down the payment still succeeds and only the notification is lost.

## Design notes

- `DISPUTE.resolved_by` references USERS, but admins are stored in ADMIN. It stays NULL and `admin_id` records who handled the dispute.
- A refunded milestone stays `FLAGGED`, because the schema has no refunded status for milestones. The dispute row shows `REFUNDED`.
- `vw_active_contracts` has names but no IDs, so the dashboard joins it back on `contract_id` to find a user's contracts.
- A contract is frozen while it is `DISPUTED`: no submitting, approving, adding milestones or further disputes.

## Test cases

Reset first (see above). Run them in order, as each one builds on the last.

| # | Log in as | Do this | Expected result |
|---|---|---|---|
| 1 | Not logged in | Open `/dashboard` | Redirected to `/login` |
| 2 | Any | Log in with a wrong password | "Wrong email or password" |
| 3 | New user | Register a new student, then log in | Lands on Browse tasks |
| 4 | Aryan | Open `/admin` | Redirected to `/tasks` |
| 5 | Aryan | Filter tasks by category "Poster Design" | No tasks shown |
| 6 | Aryan | Post a task, budget 400 | Task page opens, status OPEN |
| 7 | Kabir | Bid 350 on that task | Bid placed; Aryan gets a notification |
| 8 | Kabir | Try to bid again on the same task | The form no longer appears (the API returns "already bid") |
| 9 | Diya | Open the Flask task, accept Kabir's bid | Diya: ₹220 available, ₹280 held. Contract created, HOLD row shown, task ASSIGNED |
| 10 | Diya | Add a milestone of 300 | Rejected: more than the agreed amount |
| 11 | Diya | Add a milestone of 280 | Added, status PENDING |
| 12 | Diya and Kabir | Send chat messages on the contract | Both see them within 3 seconds |
| 13 | Kabir | Mark the milestone as submitted | Status SUBMITTED |
| 14 | Diya | Approve and release | Kabir: ₹580. RELEASE row shown. Contract and task COMPLETED |
| 15 | Diya | Leave a 5-star review | Kabir's rating becomes 5.00 through the trigger |
| 16 | Aryan | Contract 1: raise a dispute on "Draft poster" | Milestone FLAGGED, contract DISPUTED, no money moved |
| 17 | Admin | Refund poster | Aryan: ₹750 available, ₹250 held. REFUND row, dispute REFUNDED with the admin's name, contract back to ACTIVE |
| 18 | Diya | Check notifications | Shows the dispute was resolved |

**Showing a ROLLBACK:** this makes every log insert fail, so the transaction fails at its last step. Run the first command, try to accept a bid in the app, and see the error with the balances unchanged. Then run the second command to remove it.

```powershell
mysql -u root -p campus_task_board -e "CREATE TRIGGER demo_fail BEFORE INSERT ON TRANSACTION_LOG FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced failure'"
mysql -u root -p campus_task_board -e "DROP TRIGGER demo_fail"
```

## Project structure

```
campus_task_board.sql    original schema, sample data, views, functions, procedures, triggers
alter_and_queries.sql    password columns, demo data repair, extra demo queries
proxy.js                 role-based route protection
lib/                     database connections, login helpers, shared contract logic
app/api/                 route handlers (the API layer)
app/                     pages
components/              navigation bar and chat box
```
