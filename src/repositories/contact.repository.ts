import { getDatabase } from "../config/database";
import { Contact } from "../models/contact.model";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Find all non-deleted contacts matching the given email OR phoneNumber. */
export function findContactsByEmailOrPhone(
    email: string | null,
    phoneNumber: string | null
): Contact[] {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (email) {
        conditions.push("email = ?");
        params.push(email);
    }
    if (phoneNumber) {
        conditions.push("phoneNumber = ?");
        params.push(phoneNumber);
    }

    if (conditions.length === 0) return [];

    const sql = `
    SELECT * FROM contacts
    WHERE deletedAt IS NULL AND (${conditions.join(" OR ")})
    ORDER BY createdAt ASC
  `;
    return db.prepare(sql).all(...params) as Contact[];
}

/** Find a contact by ID. */
export function findContactById(id: number): Contact | undefined {
    const db = getDatabase();
    return db.prepare("SELECT * FROM contacts WHERE id = ?").get(id) as
        | Contact
        | undefined;
}

/** Find all secondary contacts linked to a given primary ID. */
export function findSecondariesByPrimaryId(primaryId: number): Contact[] {
    const db = getDatabase();
    return db
        .prepare(
            "SELECT * FROM contacts WHERE linkedId = ? AND deletedAt IS NULL ORDER BY createdAt ASC"
        )
        .all(primaryId) as Contact[];
}

/** Insert a new contact row and return it. */
export function createContact(data: {
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: "primary" | "secondary";
}): Contact {
    const db = getDatabase();
    const now = new Date().toISOString();
    const result = db
        .prepare(
            `INSERT INTO contacts (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(data.phoneNumber, data.email, data.linkedId, data.linkPrecedence, now, now);

    return findContactById(Number(result.lastInsertRowid))!;
}

/** Update a contact to become secondary of a given primary. */
export function makeSecondary(contactId: number, primaryId: number): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
        `UPDATE contacts SET linkedId = ?, linkPrecedence = 'secondary', updatedAt = ? WHERE id = ?`
    ).run(primaryId, now, contactId);
}

/** Re-link all secondaries of oldPrimary to newPrimary. */
export function relinkSecondaries(
    oldPrimaryId: number,
    newPrimaryId: number
): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare(
        `UPDATE contacts SET linkedId = ?, updatedAt = ? WHERE linkedId = ? AND deletedAt IS NULL`
    ).run(newPrimaryId, now, oldPrimaryId);
}
