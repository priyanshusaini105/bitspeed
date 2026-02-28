import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "stitcher.db");

let db: Database.Database;

export function getDatabase(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");
        db.pragma("foreign_keys = ON");
        initSchema(db);
    }
    return db;
}

function initSchema(db: Database.Database): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneNumber    TEXT,
      email          TEXT,
      linkedId       INTEGER,
      linkPrecedence TEXT NOT NULL CHECK (linkPrecedence IN ('primary', 'secondary')),
      createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt      TEXT NOT NULL DEFAULT (datetime('now')),
      deletedAt      TEXT,
      FOREIGN KEY (linkedId) REFERENCES contacts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phoneNumber);
    CREATE INDEX IF NOT EXISTS idx_contacts_linkedId ON contacts(linkedId);
  `);
}

/** Close the database connection (useful for tests). */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = undefined as any;
    }
}
