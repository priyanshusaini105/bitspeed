import express from "express";
import swaggerUi from "swagger-ui-express";
import identifyRoutes from "./routes/identify.route";
import { errorMiddleware } from "./middlewares/error.middleware";
import { swaggerSpec } from "./config/swagger";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Stitcher API Docs",
}));

// Expose raw OpenAPI JSON spec
app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({
        status: "ok",
        service: "Bitespeed Identity Reconciliation",
        version: "1.0.0",
        docs: "/api-docs"
    });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(identifyRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Stitcher running at http://localhost:${PORT}`);
    console.log(`   POST /identify  — Identity reconciliation endpoint`);
    console.log(`   GET  /api-docs  — Swagger documentation`);
});

export default app;
