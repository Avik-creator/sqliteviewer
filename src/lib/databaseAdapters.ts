/* eslint-disable @typescript-eslint/no-explicit-any */
// Use dynamic import to avoid fs module issues in browser

export interface QueryResult {
  columns: string[];
  values: any[][];
  rowCount?: number;
}

export interface TableInfo {
  name: string;
  columns: string[];
  rowCount: number;
}

export abstract class DatabaseAdapter {
  protected connectionString: string;
  protected isConnected = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract executeQuery(query: string): Promise<QueryResult>;
  abstract getTables(): Promise<TableInfo[]>;
  abstract testConnection(): Promise<boolean>;

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export class SQLiteAdapter extends DatabaseAdapter {
  private db: any | null = null;

  async connect(): Promise<boolean> {
    try {
      // Dynamic import to avoid fs module issues
      const { default: initSqlJs } = await import("sql.js");
      // @ts-expect-error - WASM file import
      const sqlWasmUrl = (await import("sql.js/dist/sql-wasm.wasm")).default;

      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl,
      });

      // For SQLite, we'll load from a file or URL
      if (this.connectionString.startsWith("sqlite://")) {
        const filePath = this.connectionString.replace("sqlite://", "");
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        this.db = new SQL.Database(uint8Array);
      } else {
        // Create empty database
        this.db = new SQL.Database();
      }

      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("SQLite connection error:", error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isConnected = false;
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    try {
      const results = this.db.exec(query);
      if (results.length === 0) {
        return { columns: [], values: [] };
      }

      const result = results[0];
      return {
        columns: result.columns || [],
        values: result.values || [],
        rowCount: result.values?.length || 0,
      };
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.db) {
      throw new Error("Database not connected");
    }

    try {
      const tablesResult = this.db.exec(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      if (!tablesResult[0]) return [];

      const tables: TableInfo[] = [];
      for (const [tableName] of tablesResult[0].values) {
        const columnsResult = this.db.exec(`PRAGMA table_info(${tableName})`);
        const columns =
          columnsResult[0]?.values.map((col: any[]) => col[1]) || [];

        const countResult = this.db.exec(`SELECT COUNT(*) FROM ${tableName}`);
        const rowCount = countResult[0]?.values[0][0] || 0;

        tables.push({
          name: tableName,
          columns,
          rowCount,
        });
      }

      return tables;
    } catch (error: any) {
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return await this.connect();
      }
      // Test with a simple query
      await this.executeQuery("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  // Method to load from file (for file uploads)
  async loadFromFile(file: File): Promise<boolean> {
    try {
      // Dynamic import to avoid fs module issues
      const { default: initSqlJs } = await import("sql.js");
      // @ts-expect-error - WASM file import
      const sqlWasmUrl = (await import("sql.js/dist/sql-wasm.wasm")).default;

      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl,
      });

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      this.db = new SQL.Database(uint8Array);
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("Error loading SQLite file:", error);
      return false;
    }
  }
}

export class PostgreSQLAdapter extends DatabaseAdapter {
  async connect(): Promise<boolean> {
    try {
      const response = await fetch("/api/database/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionString: this.connectionString,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.isConnected = true;
        return true;
      } else {
        console.error("Connection failed:", result.error);
        this.isConnected = false;
        return false;
      }
    } catch (error) {
      console.error("Connection error:", error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch("/api/database/connect", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Disconnect error:", error);
    } finally {
      this.isConnected = false;
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }

    try {
      // Try the smart query endpoint first (handles case sensitivity)
      const response = await fetch("/api/database/smart-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          connectionString: this.connectionString,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return result;
      } else {
        // Fall back to regular query if smart query fails
        const fallbackResponse = await fetch("/api/database/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            connectionString: this.connectionString,
          }),
        });

        const fallbackResult = await fallbackResponse.json();

        if (fallbackResponse.ok) {
          return fallbackResult;
        } else {
          throw new Error(fallbackResult.error || "Query execution failed");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Query execution failed: ${message}`);
    }
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }

    try {
      const response = await fetch("/api/database/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionString: this.connectionString,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return result;
      } else {
        throw new Error(result.error || "Failed to get tables");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get tables: ${message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    return this.connect();
  }
}

export class MySQLAdapter extends DatabaseAdapter {
  async connect(): Promise<boolean> {
    try {
      const response = await fetch("/api/database/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionString: this.connectionString,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.isConnected = true;
        return true;
      } else {
        console.error("Connection failed:", result.error);
        this.isConnected = false;
        return false;
      }
    } catch (error) {
      console.error("Connection error:", error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch("/api/database/connect", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Disconnect error:", error);
    } finally {
      this.isConnected = false;
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }

    try {
      const response = await fetch("/api/database/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          connectionString: this.connectionString,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return result;
      } else {
        throw new Error(result.error || "Query execution failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Query execution failed: ${message}`);
    }
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }

    try {
      const response = await fetch("/api/database/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionString: this.connectionString,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return result;
      } else {
        throw new Error(result.error || "Failed to get tables");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get tables: ${message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    return this.connect();
  }
}

export function createDatabaseAdapter(
  type: string,
  connectionString: string
): DatabaseAdapter {
  switch (type.toLowerCase()) {
    case "sqlite":
      return new SQLiteAdapter(connectionString);
    case "postgresql":
      return new PostgreSQLAdapter(connectionString);
    case "mysql":
      return new MySQLAdapter(connectionString);
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}
