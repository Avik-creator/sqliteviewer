import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Helper function to find the correct case of table name
async function findActualTableName(
  pool: Pool,
  tableName: string
): Promise<string | null> {
  const client = await pool.connect();

  try {
    // First try exact match
    const exactQuery = `
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = $1;
    `;

    let result = await client.query(exactQuery, [tableName]);
    if (result.rows.length > 0) {
      return result.rows[0].relname;
    }

    // Try case-insensitive match
    const caseInsensitiveQuery = `
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND LOWER(c.relname) = LOWER($1);
    `;

    result = await client.query(caseInsensitiveQuery, [tableName]);
    if (result.rows.length > 0) {
      return result.rows[0].relname;
    }

    return null;
  } finally {
    client.release();
  }
}

// Helper function to fix table names in SQL queries
function fixTableNamesInQuery(
  query: string,
  tableMap: Map<string, string>
): string {
  let fixedQuery = query;

  for (const [searchName, actualName] of tableMap) {
    // Replace table names in various SQL contexts
    const patterns = [
      new RegExp(`\\bFROM\\s+${searchName}\\b`, "gi"),
      new RegExp(`\\bJOIN\\s+${searchName}\\b`, "gi"),
      new RegExp(`\\bUPDATE\\s+${searchName}\\b`, "gi"),
      new RegExp(`\\bINTO\\s+${searchName}\\b`, "gi"),
    ];

    patterns.forEach((pattern) => {
      fixedQuery = fixedQuery.replace(pattern, (match) => {
        return match.replace(new RegExp(searchName, "gi"), `"${actualName}"`);
      });
    });
  }

  return fixedQuery;
}

export async function POST(request: NextRequest) {
  try {
    const { query, connectionString } = await request.json();

    if (!query || !connectionString) {
      return NextResponse.json(
        {
          error: "Query and connection string are required",
        },
        { status: 400 }
      );
    }

    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      // Extract potential table names from the query
      const tableRegex =
        /(?:FROM|JOIN|UPDATE|INTO)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
      const matches = [...query.matchAll(tableRegex)];
      const tableNames = [...new Set(matches.map((match) => match[1]))];

      // Build a map of table names to their actual case
      const tableMap = new Map<string, string>();
      for (const tableName of tableNames) {
        const actualName = await findActualTableName(pool, tableName);
        if (actualName) {
          tableMap.set(tableName, actualName);
        }
      }

      // Fix the query with correct table names
      const fixedQuery = fixTableNamesInQuery(query, tableMap);

      // Execute the fixed query
      const client = await pool.connect();

      try {
        const result = await client.query(fixedQuery);

        const response = {
          columns: result.fields.map((field: { name: string }) => field.name),
          values: result.rows.map((row: Record<string, unknown>) =>
            Object.values(row)
          ),
          rowCount: result.rowCount || 0,
          originalQuery: query,
          fixedQuery: fixedQuery,
        };

        return NextResponse.json(response);
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  } catch (error: unknown) {
    console.error("Smart query execution error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Query failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
