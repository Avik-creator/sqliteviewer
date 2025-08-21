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
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
        { status: 400 }
      );
    }

    const dbType = getDatabaseType(connectionString);

    if (dbType === "postgresql") {
      // Handle PostgreSQL tables
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
        // Query to get table information - use pg_class for better case handling
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
    } else if (dbType === "mysql") {
      // Handle MySQL tables
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
        // Query to get table information
        const [tablesResult] = await connection.query(`
          SELECT 
            t.table_name,
            t.table_rows as row_count
          FROM information_schema.tables t
          WHERE t.table_schema = DATABASE()
          AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name;
        `);

        const tables = await Promise.all(
          (
            tablesResult as Array<{ table_name: string; row_count: number }>
          ).map(async (table) => {
            // Get column information
            const [columnsResult] = await connection.query(
              `
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_name = ?
              AND table_schema = DATABASE()
              ORDER BY ordinal_position;
            `,
              [table.table_name]
            );

            const columns = (
              columnsResult as Array<{ column_name: string }>
            ).map((col) => col.column_name);

            // Get actual row count if needed
            let rowCount = table.row_count || 0;
            if (!rowCount) {
              try {
                const [countResult] = await connection.query(
                  `SELECT COUNT(*) as count FROM ??`,
                  [table.table_name]
                );
                rowCount =
                  (countResult as Array<{ count: number }>)[0]?.count || 0;
              } catch {
                rowCount = 0;
              }
            }

            return {
              name: table.table_name,
              columns,
              rowCount: Number(rowCount),
            };
          })
        );

        return NextResponse.json(tables);
      } finally {
        connection.release();
        await pool.end();
      }
    } else if (dbType === "sqlite") {
      // Handle SQLite tables
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
          // Get table names
          const tablesResult = db.exec(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name;
          `);

          const tables = [];

          if (tablesResult.length > 0) {
            const tableNames = tablesResult[0].values.map(
              (row: unknown[]) => row[0] as string
            );

            for (const tableName of tableNames) {
              // Get columns for each table
              const columnsResult = db.exec(`PRAGMA table_info(${tableName});`);
              const columns =
                columnsResult.length > 0
                  ? columnsResult[0].values.map(
                      (row: unknown[]) => row[1] as string
                    )
                  : [];

              // Get row count
              const countResult = db.exec(
                `SELECT COUNT(*) as count FROM "${tableName}";`
              );
              const rowCount =
                countResult.length > 0
                  ? (countResult[0].values[0][0] as number)
                  : 0;

              tables.push({
                name: tableName,
                columns,
                rowCount,
              });
            }
          }

          return NextResponse.json(tables);
        } finally {
          db.close();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`SQLite tables query failed: ${message}`);
      }
    }

    return NextResponse.json(
      { error: "Unsupported database type" },
      { status: 400 }
    );
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
