import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

let whatsappDb: ReturnType<typeof drizzle> | null = null;
let whatsappSqlite: Database.Database | null = null;

/**
 * Initialize WhatsApp database connection
 * @param dbPath Path to WhatsApp ChatStorage.sqlite file
 */
export function initWhatsAppDb(dbPath: string) {
  if (whatsappSqlite) {
    whatsappSqlite.close();
  }

  whatsappSqlite = new Database(dbPath, { readonly: true });
  whatsappDb = drizzle(whatsappSqlite);

  return whatsappDb;
}

/**
 * Get WhatsApp database instance
 */
export function getWhatsAppDb() {
  if (!whatsappDb) {
    throw new Error("WhatsApp database not initialized. Call initWhatsAppDb first.");
  }
  return whatsappDb;
}

/**
 * Close WhatsApp database connection
 */
export function closeWhatsAppDb() {
  if (whatsappSqlite) {
    whatsappSqlite.close();
    whatsappSqlite = null;
    whatsappDb = null;
  }
}
