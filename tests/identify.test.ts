import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { getDatabase, closeDatabase } from "../src/config/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wipe the contacts table between tests for isolation. */
function clearContacts() {
    const db = getDatabase();
    db.exec("DELETE FROM contacts");
}

beforeEach(() => {
    clearContacts();
});

afterAll(() => {
    closeDatabase();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /identify", () => {
    // ── Validation ────────────────────────────────────────────────────────────

    it("returns 400 when neither email nor phoneNumber is provided", async () => {
        const res = await request(app).post("/identify").send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it("returns 400 when body is empty", async () => {
        const res = await request(app)
            .post("/identify")
            .send({ email: null, phoneNumber: null });
        expect(res.status).toBe(400);
    });

    // ── New Contact (Primary Creation) ────────────────────────────────────────

    it("creates a new primary contact for a brand-new customer", async () => {
        const res = await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

        expect(res.status).toBe(200);
        expect(res.body.contact).toBeDefined();
        expect(res.body.contact.emails).toEqual(["lorraine@hillvalley.edu"]);
        expect(res.body.contact.phoneNumbers).toEqual(["123456"]);
        expect(res.body.contact.secondaryContactIds).toEqual([]);
    });

    // ── Secondary Creation ────────────────────────────────────────────────────

    it("creates a secondary contact when new info is provided with an existing phone", async () => {
        // First request: create primary
        await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

        // Second request: same phone, new email → secondary
        const res = await request(app)
            .post("/identify")
            .send({ email: "mcfly@hillvalley.edu", phoneNumber: "123456" });

        expect(res.status).toBe(200);
        const { contact } = res.body;
        expect(contact.emails).toContain("lorraine@hillvalley.edu");
        expect(contact.emails).toContain("mcfly@hillvalley.edu");
        expect(contact.emails[0]).toBe("lorraine@hillvalley.edu"); // primary's email first
        expect(contact.phoneNumbers).toEqual(["123456"]);
        expect(contact.secondaryContactIds).toHaveLength(1);
    });

    // ── No Duplicate Creation ─────────────────────────────────────────────────

    it("does NOT create a duplicate when request matches existing data exactly", async () => {
        await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

        const res = await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

        expect(res.status).toBe(200);
        expect(res.body.contact.secondaryContactIds).toEqual([]);
    });

    // ── Primary Merge ─────────────────────────────────────────────────────────

    it("merges two primaries when request links them together", async () => {
        // Create two separate primaries
        await request(app)
            .post("/identify")
            .send({ email: "george@hillvalley.edu", phoneNumber: "919191" });

        await request(app)
            .post("/identify")
            .send({ email: "biffsucks@hillvalley.edu", phoneNumber: "717171" });

        // Link them: george's email + second primary's phone
        const res = await request(app)
            .post("/identify")
            .send({ email: "george@hillvalley.edu", phoneNumber: "717171" });

        expect(res.status).toBe(200);
        const { contact } = res.body;

        // Oldest primary remains
        expect(contact.emails[0]).toBe("george@hillvalley.edu");
        expect(contact.phoneNumbers[0]).toBe("919191");
        expect(contact.emails).toContain("biffsucks@hillvalley.edu");
        expect(contact.phoneNumbers).toContain("717171");
        expect(contact.secondaryContactIds.length).toBeGreaterThanOrEqual(1);
    });

    // ── Email Only ────────────────────────────────────────────────────────────

    it("works with email only", async () => {
        await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

        const res = await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu" });

        expect(res.status).toBe(200);
        expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
        expect(res.body.contact.phoneNumbers).toContain("123456");
    });

    // ── Phone Only ────────────────────────────────────────────────────────────

    it("works with phoneNumber only", async () => {
        await request(app)
            .post("/identify")
            .send({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });

        const res = await request(app)
            .post("/identify")
            .send({ phoneNumber: "123456" });

        expect(res.status).toBe(200);
        expect(res.body.contact.emails).toContain("lorraine@hillvalley.edu");
        expect(res.body.contact.phoneNumbers).toContain("123456");
    });

    // ── Numeric phoneNumber ───────────────────────────────────────────────────

    it("handles numeric phoneNumber (converts to string)", async () => {
        const res = await request(app)
            .post("/identify")
            .send({ email: "test@test.com", phoneNumber: 9876543210 });

        expect(res.status).toBe(200);
        expect(res.body.contact.phoneNumbers).toEqual(["9876543210"]);
    });

    // ── Chain of secondaries ──────────────────────────────────────────────────

    it("correctly chains multiple secondaries", async () => {
        // Create primary
        await request(app)
            .post("/identify")
            .send({ email: "a@test.com", phoneNumber: "111" });

        // Add secondary via phone match
        await request(app)
            .post("/identify")
            .send({ email: "b@test.com", phoneNumber: "111" });

        // Add another secondary via email match
        await request(app)
            .post("/identify")
            .send({ email: "a@test.com", phoneNumber: "222" });

        // Query with only the latest info
        const res = await request(app)
            .post("/identify")
            .send({ phoneNumber: "222" });

        expect(res.status).toBe(200);
        const { contact } = res.body;
        expect(contact.emails).toContain("a@test.com");
        expect(contact.emails).toContain("b@test.com");
        expect(contact.phoneNumbers).toContain("111");
        expect(contact.phoneNumbers).toContain("222");
        expect(contact.secondaryContactIds).toHaveLength(2);
    });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

describe("GET /", () => {
    it("returns health check response", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });
});
