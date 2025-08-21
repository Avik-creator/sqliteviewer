import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import mysql from "mysql2/promise";

// Global connection pools for different database types
let postgresPool: Pool | null = null;
let mysqlPool: mysql.Pool | null = null;

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
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
        { status: 400 }
      );
    }

    const dbType = getDatabaseType(connectionString);

    // Close existing connections
    if (postgresPool) {
      await postgresPool.end();
      postgresPool = null;
    }
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
    }

    if (dbType === "postgresql") {
      // Create PostgreSQL connection pool
      postgresPool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test the connection
      const client = await postgresPool.connect();
      await client.query("SELECT NOW()");
      client.release();
    } else if (dbType === "mysql") {
      // Parse MySQL connection string
      const url = new URL(connectionString);

      mysqlPool = mysql.createPool({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        ssl: url.searchParams.get("ssl") === "true" ? {} : undefined,
        connectionLimit: 20,
      });

      // Test the connection
      const connection = await mysqlPool.getConnection();
      await connection.query("SELECT NOW()");
      connection.release();
    } else if (dbType === "sqlite") {
      // SQLite doesn't need server-side connection pooling
      // The connection will be handled in the query routes
      return NextResponse.json({
        success: true,
        message: "SQLite connection configured",
        type: "sqlite",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Connected successfully",
      type: dbType,
    });
  } catch (error: unknown) {
    console.error("Database connection error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Connection failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Close all existing connections
    if (postgresPool) {
      await postgresPool.end();
      postgresPool = null;
    }
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
    }
    return NextResponse.json({
      success: true,
      message: "Disconnected successfully",
    });
  } catch (error: unknown) {
    console.error("Database disconnection error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Disconnection failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
