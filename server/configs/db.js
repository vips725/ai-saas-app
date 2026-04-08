import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config(); // 🔥 ADD THIS HERE

console.log("DATABASE_URL:", process.env.DATABASE_URL); // debug

const sql = neon(process.env.DATABASE_URL);

export default sql;