import { Request, Response } from "express";
import { identify } from "../services/contact.service";
import { validateIdentifyRequest, ValidationError } from "../utils/validators";

export function identifyController(req: Request, res: Response): void {
    try {
        const { email, phoneNumber } = validateIdentifyRequest(req.body);
        const result = identify(email, phoneNumber);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof ValidationError) {
            res.status(400).json({ error: error.message });
            return;
        }
        console.error("Unexpected error in /identify:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
