import { Contact, IdentifyResponse } from "../models/contact.model";
import {
    findContactsByEmailOrPhone,
    findContactById,
    findSecondariesByPrimaryId,
    createContact,
    makeSecondary,
    relinkSecondaries,
} from "../repositories/contact.repository";

/**
 * Core identity reconciliation logic.
 *
 * 1. Find all contacts matching the incoming email OR phone.
 * 2. Resolve unique primary contacts from the matches.
 * 3. If no matches → create a new primary contact.
 * 4. If one primary group → optionally create a secondary with new info.
 * 5. If multiple primary groups → merge them (oldest stays primary).
 * 6. Build and return the consolidated response.
 */
export function identify(
    email: string | null,
    phoneNumber: string | null
): IdentifyResponse {
    // Step 1: Find matching contacts
    const matches = findContactsByEmailOrPhone(email, phoneNumber);

    // Step 2: No matches – brand-new customer
    if (matches.length === 0) {
        const newContact = createContact({
            phoneNumber,
            email,
            linkedId: null,
            linkPrecedence: "primary",
        });
        return buildResponse(newContact.id);
    }

    // Step 3: Resolve all distinct primary IDs
    const primaryIds = new Set<number>();
    for (const contact of matches) {
        if (contact.linkPrecedence === "primary") {
            primaryIds.add(contact.id);
        } else if (contact.linkedId !== null) {
            primaryIds.add(contact.linkedId);
        }
    }

    // Step 4: If multiple primaries, merge them
    let primaryId: number;
    if (primaryIds.size > 1) {
        primaryId = mergePrimaries([...primaryIds]);
    } else {
        primaryId = [...primaryIds][0];
    }

    // Step 5: Check if the incoming request has genuinely new information
    const allContacts = getAllContactsForPrimary(primaryId);
    const existingEmails = new Set(allContacts.map((c) => c.email).filter(Boolean));
    const existingPhones = new Set(
        allContacts.map((c) => c.phoneNumber).filter(Boolean)
    );

    const hasNewEmail = email !== null && !existingEmails.has(email);
    const hasNewPhone = phoneNumber !== null && !existingPhones.has(phoneNumber);

    if (hasNewEmail || hasNewPhone) {
        createContact({
            phoneNumber,
            email,
            linkedId: primaryId,
            linkPrecedence: "secondary",
        });
    }

    // Step 6: Build response
    return buildResponse(primaryId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Merge multiple primary contact groups.
 * The oldest primary (smallest createdAt) stays primary.
 * All others become secondary linked to it. Their secondaries are re-linked too.
 */
function mergePrimaries(primaryIds: number[]): number {
    // Fetch all primary contacts and sort by createdAt ASC
    const primaries = primaryIds
        .map((id) => findContactById(id))
        .filter((c): c is Contact => c !== undefined)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const oldestPrimary = primaries[0];

    for (let i = 1; i < primaries.length; i++) {
        const otherPrimary = primaries[i];
        // Re-link all secondaries of this primary to the oldest primary
        relinkSecondaries(otherPrimary.id, oldestPrimary.id);
        // Make this primary a secondary of the oldest
        makeSecondary(otherPrimary.id, oldestPrimary.id);
    }

    return oldestPrimary.id;
}

/** Gather the primary contact + all its secondaries. */
function getAllContactsForPrimary(primaryId: number): Contact[] {
    const primary = findContactById(primaryId);
    if (!primary) return [];
    const secondaries = findSecondariesByPrimaryId(primaryId);
    return [primary, ...secondaries];
}

/** Build the API response from a primary contact and its group. */
function buildResponse(primaryId: number): IdentifyResponse {
    const allContacts = getAllContactsForPrimary(primaryId);
    const primary = allContacts[0]; // first is the primary

    // Collect unique emails and phones, primary's first
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    // Add primary's data first
    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

    // Add secondaries' data
    for (let i = 1; i < allContacts.length; i++) {
        const contact = allContacts[i];
        secondaryContactIds.push(contact.id);
        if (contact.email && !emails.includes(contact.email)) {
            emails.push(contact.email);
        }
        if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
            phoneNumbers.push(contact.phoneNumber);
        }
    }

    return {
        contact: {
            primaryContatctId: primaryId,
            emails,
            phoneNumbers,
            secondaryContactIds,
        },
    };
}
