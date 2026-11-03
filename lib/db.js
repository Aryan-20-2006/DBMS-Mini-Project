import mysql from "mysql2/promise";

// One shared connection pool. Kept on globalThis so hot reload in dev
// does not open a new pool on every code change.
const pool =
  globalThis.mysqlPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    dateStrings: true, // return dates as plain text so they do not shift by timezone
  });

globalThis.mysqlPool = pool;

export default pool;
