import { MongoClient } from "mongodb";

// One shared client, kept on globalThis for the same reason as the MySQL pool.
const client =
  globalThis.mongoClient ??
  new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });

globalThis.mongoClient = client;

// MongoDB creates the two collections by itself on the first insert:
//   messages:      { contract_id, sender_id, sender_name, text, created_at }
//   notifications: { user_id, type, message, link, read, created_at }
export function getDb() {
  return client.db(process.env.MONGODB_DB);
}
