import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
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

    const client = await pool.connect();

    try {
      // Query to get table information - use both information_schema and pg_class for better case handling
      const tablesQuery = `
        SELECT 
          c.relname as table_name,
          COALESCE(s.n_tup_ins - s.n_tup_del, s.n_live_tup, 0) as row_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON c.relname = s.relname
        WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        ORDER BY c.relname;
      `;

      const tablesResult = await client.query(tablesQuery);

      const tables = await Promise.all(
        tablesResult.rows.map(
          async (table: { table_name: string; row_count: number }) => {
            // Get column information for each table - use pg_attribute for exact case
            const columnsQuery = `
            SELECT a.attname as column_name, 
                   format_type(a.atttypid, a.atttypmod) as data_type
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = $1
            AND n.nspname = 'public'
            AND a.attnum > 0
            AND NOT a.attisdropped
            ORDER BY a.attnum;
          `;

            const columnsResult = await client.query(columnsQuery, [
              table.table_name,
            ]);
            const columns = columnsResult.rows.map(
              (col: { column_name: string }) => col.column_name
            );

            // Get actual row count if the statistical count is 0 or null
            let rowCount = table.row_count;
            if (!rowCount || rowCount === 0) {
              try {
                // Use parameterized query to safely handle table names
                const countQuery = `SELECT COUNT(*) as count FROM "${table.table_name}"`;
                const countResult = await client.query(countQuery);
                rowCount = parseInt(countResult.rows[0].count, 10);
              } catch {
                // If double quotes fail, try without quotes (for lowercase tables)
                try {
                  const countQuery2 = `SELECT COUNT(*) as count FROM ${table.table_name}`;
                  const countResult2 = await client.query(countQuery2);
                  rowCount = parseInt(countResult2.rows[0].count, 10);
                } catch {
                  // If both fail, default to 0
                  rowCount = 0;
                }
              }
            }

            return {
              name: table.table_name,
              columns,
              rowCount,
            };
          }
        )
      );

      return NextResponse.json(tables);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: unknown) {
    console.error("Tables query error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get tables: ${errorMessage}` },
      { status: 500 }
    );
  }
}
