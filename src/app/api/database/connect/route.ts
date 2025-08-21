import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

let connectionPool: Pool | null = null;

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
        { status: 400 }
      );
    }

    // Close existing connection if any
    if (connectionPool) {
      await connectionPool.end();
    }

    // Create new connection pool
    connectionPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test the connection
    const client = await connectionPool.connect();
    await client.query("SELECT NOW()");
    client.release();

    return NextResponse.json({
      success: true,
      message: "Connected successfully",
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
    if (connectionPool) {
      await connectionPool.end();
      connectionPool = null;
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

export { connectionPool };
