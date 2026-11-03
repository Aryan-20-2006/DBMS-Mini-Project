import { spawnSync } from "node:child_process";
import { MongoClient } from "mongodb";

const DEFAULT_MYSQL = "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe";

function fail(message) {
  console.error(`Reset failed: ${message}`);
  process.exit(1);
}

// Uses the mysql program because the SQL files need its DELIMITER and source commands.
function findMysql() {
  if (!spawnSync("mysql", ["--version"]).error) return "mysql";
  if (!spawnSync(DEFAULT_MYSQL, ["--version"]).error) return DEFAULT_MYSQL;
  fail("could not find the mysql program. Check that MySQL 8 is installed.");
}

function runSql(mysql, statement) {
  const { status, stderr } = spawnSync(
    mysql,
    ["-h", process.env.DB_HOST, "-P", process.env.DB_PORT, "-u", process.env.DB_USER, "-e", statement],
    { env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD }, encoding: "utf8" }
  );
  if (status !== 0) fail(`"${statement}" did not run.\n${stderr}`);
}

const mysql = findMysql();
const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });

// Connect first, so a stopped MongoDB does not leave only MySQL reset.
try {
  await mongo.connect();
} catch {
  fail("could not connect to MongoDB. Check that the service is running.");
}

runSql(mysql, "DROP DATABASE IF EXISTS campus_task_board");
runSql(mysql, "source campus_task_board.sql");
runSql(mysql, "source alter_and_queries.sql");
console.log("MySQL is back to the sample data.");

await mongo.db(process.env.MONGODB_DB).dropDatabase();
await mongo.close();
console.log("MongoDB chat and notifications are cleared.");
