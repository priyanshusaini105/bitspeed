# Stitcher — Bitespeed Identity Reconciliation Service

A web service that identifies and links customer contacts across multiple purchases, even when different email addresses and phone numbers are used.

## 🏗️ Architecture

```
src/
├── config/database.ts           # SQLite connection & schema
├── controllers/identify.controller.ts  # Request handler
├── middlewares/error.middleware.ts      # Global error handler
├── models/contact.model.ts      # TypeScript interfaces
├── repositories/contact.repository.ts  # Database queries
├── routes/identify.route.ts     # Route definitions
├── services/contact.service.ts  # Core reconciliation logic
├── utils/validators.ts          # Input validation
└── index.ts                     # Express app entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000` by default.

### Run Tests

```bash
npm test
```

### Build for Production

```bash
npm run build
npm start
```

## 📡 API Endpoints

### `GET /`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "Bitespeed Identity Reconciliation",
  "version": "1.0.0"
}
```

### `POST /identify`

Identify and reconcile a customer's contact information.

**Request Body (JSON):**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string | number (optional)"
}
```

> At least one of `email` or `phoneNumber` must be provided.

**Response (200):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "789012"],
    "secondaryContactIds": [2, 3]
  }
}
```

## 🔄 How It Works

1. **New Customer** — If no matching contact exists, a new primary contact is created.
2. **Existing Customer, New Info** — If a match is found but the request contains new email/phone, a secondary contact is created and linked to the primary.
3. **Merging Primaries** — If a request links two previously separate primary contacts (e.g., one's email + the other's phone), the newer primary becomes secondary of the older one.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime   | Node.js    |
| Language  | TypeScript |
| Framework | Express.js |
| Database  | SQLite (better-sqlite3) |
| Testing   | Vitest + Supertest |

## 🌐 Hosted Endpoint

> _Replace with your hosted URL after deployment_
>
> `https://your-app.onrender.com/identify`

## 📜 License

MIT
