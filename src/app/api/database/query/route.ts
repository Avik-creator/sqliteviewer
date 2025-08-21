import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Import the connection pool from connect route
let connectionPool: Pool | null = null;

// Helper function to set connection pool (will be called by connect route)
export function setConnectionPool(pool: Pool | null) {
  connectionPool = pool;
}

export async function POST(request: NextRequest) {
  try {
    const { query, connectionString } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    let pool = connectionPool;

    // If no existing pool but connectionString provided, create a temporary connection
    if (!pool && connectionString) {
      pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    if (!pool) {
      return NextResponse.json(
        { error: "No database connection available" },
        { status: 500 }
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(query);

      const response = {
        columns: result.fields.map((field: { name: string }) => field.name),
        values: result.rows.map((row: Record<string, unknown>) =>
          Object.values(row)
        ),
        rowCount: result.rowCount || 0,
      };

      return NextResponse.json(response);
    } finally {
      client.release();

      // Close temporary connection if it was created for this query
      if (!connectionPool && pool) {
        await pool.end();
      }
    }
  } catch (error: unknown) {
    console.error("Query execution error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Query failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
