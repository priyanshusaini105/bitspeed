import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Bitespeed Identity Reconciliation API",
            version: "1.0.0",
            description:
                "A service that identifies and links customer contacts across multiple purchases, even when different email addresses and phone numbers are used. Built for the Bitespeed backend task.",
            contact: {
                name: "Bitespeed",
            },
        },
        tags: [
            {
                name: "Identity",
                description: "Contact identity reconciliation",
            },
            {
                name: "Health",
                description: "Service health checks",
            },
        ],
        paths: {
            "/identify": {
                post: {
                    tags: ["Identity"],
                    summary: "Identify and reconcile a customer contact",
                    description: `Receives an email and/or phone number and reconciles against existing contacts.

**Behavior:**
- **New customer** — Creates a primary contact if no match is found.
- **Existing customer, new info** — Creates a secondary contact linked to the primary.
- **Two separate primaries linked** — Merges them; the older one stays primary, the newer becomes secondary.`,
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/IdentifyRequest",
                                },
                                examples: {
                                    "new-customer": {
                                        summary: "New customer",
                                        value: {
                                            email: "lorraine@hillvalley.edu",
                                            phoneNumber: "123456",
                                        },
                                    },
                                    "link-existing": {
                                        summary: "Link to existing (same phone, new email)",
                                        value: {
                                            email: "mcfly@hillvalley.edu",
                                            phoneNumber: "123456",
                                        },
                                    },
                                    "email-only": {
                                        summary: "Email only",
                                        value: {
                                            email: "lorraine@hillvalley.edu",
                                        },
                                    },
                                    "phone-only": {
                                        summary: "Phone number only",
                                        value: {
                                            phoneNumber: "123456",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "Consolidated contact information",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/IdentifyResponse",
                                    },
                                    example: {
                                        contact: {
                                            primaryContatctId: 1,
                                            emails: [
                                                "lorraine@hillvalley.edu",
                                                "mcfly@hillvalley.edu",
                                            ],
                                            phoneNumbers: ["123456"],
                                            secondaryContactIds: [23],
                                        },
                                    },
                                },
                            },
                        },
                        "400": {
                            description: "Validation error",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse",
                                    },
                                    example: {
                                        error:
                                            "At least one of 'email' or 'phoneNumber' must be provided",
                                    },
                                },
                            },
                        },
                        "500": {
                            description: "Internal server error",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse",
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "/": {
                get: {
                    tags: ["Health"],
                    summary: "Health check",
                    description: "Returns the service status and version.",
                    responses: {
                        "200": {
                            description: "Service is healthy",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/HealthResponse",
                                    },
                                    example: {
                                        status: "ok",
                                        service: "Bitespeed Identity Reconciliation",
                                        version: "1.0.0",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        components: {
            schemas: {
                IdentifyRequest: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            nullable: true,
                            description: "Customer email address",
                            example: "lorraine@hillvalley.edu",
                        },
                        phoneNumber: {
                            oneOf: [{ type: "string" }, { type: "number" }],
                            nullable: true,
                            description:
                                "Customer phone number (string or number, will be normalized to string)",
                            example: "123456",
                        },
                    },
                    description:
                        "At least one of `email` or `phoneNumber` must be provided.",
                },
                IdentifyResponse: {
                    type: "object",
                    required: ["contact"],
                    properties: {
                        contact: {
                            type: "object",
                            required: [
                                "primaryContatctId",
                                "emails",
                                "phoneNumbers",
                                "secondaryContactIds",
                            ],
                            properties: {
                                primaryContatctId: {
                                    type: "integer",
                                    description: "ID of the primary contact",
                                    example: 1,
                                },
                                emails: {
                                    type: "array",
                                    items: { type: "string" },
                                    description:
                                        "All emails in the contact group, primary's email first",
                                    example: [
                                        "lorraine@hillvalley.edu",
                                        "mcfly@hillvalley.edu",
                                    ],
                                },
                                phoneNumbers: {
                                    type: "array",
                                    items: { type: "string" },
                                    description:
                                        "All phone numbers in the contact group, primary's phone first",
                                    example: ["123456"],
                                },
                                secondaryContactIds: {
                                    type: "array",
                                    items: { type: "integer" },
                                    description:
                                        "IDs of all secondary contacts linked to the primary",
                                    example: [23],
                                },
                            },
                        },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        error: {
                            type: "string",
                            description: "Error message",
                        },
                    },
                },
                HealthResponse: {
                    type: "object",
                    properties: {
                        status: { type: "string", example: "ok" },
                        service: {
                            type: "string",
                            example: "Bitespeed Identity Reconciliation",
                        },
                        version: { type: "string", example: "1.0.0" },
                    },
                },
            },
        },
    },
    apis: [], // We define everything inline above
};

export const swaggerSpec = swaggerJsdoc(options);
