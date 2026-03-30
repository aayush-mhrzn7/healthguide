"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
require("../loadEnv");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}
const pool = new pg_1.Pool({
    connectionString,
});
exports.db = (0, node_postgres_1.drizzle)(pool);
