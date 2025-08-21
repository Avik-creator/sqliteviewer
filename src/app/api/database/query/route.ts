import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import mysql from "mysql2/promise";

// Helper function to detect database type from connection string
function getDatabaseType(
  connectionString: string
): "postgresql" | "mysql" | "sqlite" {
  if (
    connectionString.startsWith("postgresql://") ||
    connectionString.startsWith("postgres://")
  ) {
    return "postgresql";
  } else if (connectionString.startsWith("mysql://")) {
    return "mysql";
  } else if (connectionString.startsWith("sqlite://")) {
    return "sqlite";
  }
  // Default fallback - try to detect from content
  if (connectionString.includes("mysql")) return "mysql";
  if (connectionString.includes("postgres")) return "postgresql";
  return "sqlite";
}

export async function POST(request: NextRequest) {
  try {
    const { query, connectionString } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
        { status: 400 }
      );
    }

    const dbType = getDatabaseType(connectionString);

    if (dbType === "postgresql") {
      // Handle PostgreSQL query
      const pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

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
        await pool.end();
      }
    } else if (dbType === "mysql") {
      // Handle MySQL query
      const url = new URL(connectionString);

      const pool = mysql.createPool({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        ssl: url.searchParams.get("ssl") === "true" ? {} : undefined,
        connectionLimit: 5,
      });

      const connection = await pool.getConnection();

      try {
        const [rows] = await connection.query(query);

        // Handle different result types
        let columns: string[] = [];
        let values: unknown[][] = [];
        let rowCount = 0;

        if (Array.isArray(rows)) {
          if (rows.length > 0 && typeof rows[0] === "object") {
            // SELECT query result
            columns = Object.keys(rows[0] as Record<string, unknown>);
            values = rows.map((row) =>
              Object.values(row as Record<string, unknown>)
            );
            rowCount = rows.length;
          }
        } else if (
          typeof rows === "object" &&
          rows !== null &&
          "affectedRows" in rows
        ) {
          // INSERT/UPDATE/DELETE result
          columns = ["affected_rows"];
          values = [[(rows as { affectedRows: number }).affectedRows]];
          rowCount = (rows as { affectedRows: number }).affectedRows;
        }

        return NextResponse.json({
          columns,
          values,
          rowCount,
        });
      } finally {
        connection.release();
        await pool.end();
      }
    } else if (dbType === "sqlite") {
      // Handle SQLite query (browser-based with sql.js)
      try {
        // Dynamic import to avoid fs module issues
        const { default: initSqlJs } = await import("sql.js");
        // @ts-expect-error - WASM file import
        const sqlWasmUrl = (await import("sql.js/dist/sql-wasm.wasm")).default;

        const SQL = await initSqlJs({
          locateFile: () => sqlWasmUrl,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let db: any;

        if (connectionString.startsWith("sqlite://")) {
          const filePath = connectionString.replace("sqlite://", "");
          const response = await fetch(filePath);
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          db = new SQL.Database(uint8Array);
        } else {
          // Create empty database
          db = new SQL.Database();
        }

        try {
          const results = db.exec(query);

          if (results.length === 0) {
            return NextResponse.json({ columns: [], values: [] });
          }

          const result = results[0];
          return NextResponse.json({
            columns: result.columns || [],
            values: result.values || [],
            rowCount: result.values?.length || 0,
          });
        } finally {
          db.close();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`SQLite query execution failed: ${message}`);
      }
    }

    return NextResponse.json(
      { error: "Unsupported database type" },
      { status: 400 }
    );
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
