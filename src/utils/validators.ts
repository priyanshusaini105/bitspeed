import { IdentifyRequest } from "../models/contact.model";

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

/**
 * Validate and normalize the /identify request body.
 * Returns a normalized { email, phoneNumber } object.
 */
export function validateIdentifyRequest(body: any): {
    email: string | null;
    phoneNumber: string | null;
} {
    if (!body || typeof body !== "object") {
        throw new ValidationError("Request body must be a JSON object");
    }

    const { email, phoneNumber } = body as IdentifyRequest;

    // At least one must be provided and non-null
    if (
        (email === undefined || email === null || email === "") &&
        (phoneNumber === undefined || phoneNumber === null || phoneNumber === "")
    ) {
        throw new ValidationError(
            "At least one of 'email' or 'phoneNumber' must be provided"
        );
    }

    // Normalize
    const normalizedEmail =
        email !== undefined && email !== null && email !== ""
            ? String(email).trim().toLowerCase()
            : null;

    const normalizedPhone =
        phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== ""
            ? String(phoneNumber).trim()
            : null;

    return { email: normalizedEmail, phoneNumber: normalizedPhone };
}
