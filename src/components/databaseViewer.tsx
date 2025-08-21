/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Play, Database, Settings, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ConnectionManager, {
  type DatabaseConnection,
} from "./connectionManager";
import EnhancedTableViewer from "./enhancedTableViewer";
import {
  createDatabaseAdapter,
  type DatabaseAdapter,
  type TableInfo,
  type QueryResult,
  SQLiteAdapter,
} from "@/lib/databaseAdapters";

export default function DatabaseViewer() {
  const [currentAdapter, setCurrentAdapter] = useState<DatabaseAdapter | null>(
    null
  );
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [showConnections, setShowConnections] = useState(false);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] =
    useState<DatabaseConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddConnection = (
    connectionData: Omit<
      DatabaseConnection,
      "id" | "isConnected" | "lastTested"
    >
  ) => {
    const newConnection: DatabaseConnection = {
      ...connectionData,
      id: Date.now().toString(),
      isConnected: false,
      lastTested: new Date(),
    };
    setConnections((prev) => [...prev, newConnection]);
  };

  const handleDeleteConnection = (id: string) => {
    setConnections((prev) => prev.filter((conn) => conn.id !== id));
    if (selectedConnection?.id === id) {
      handleDisconnect();
    }
  };

  const handleTestConnection = async (id: string): Promise<boolean> => {
    const connection = connections.find((conn) => conn.id === id);
    if (!connection) return false;

    try {
      const adapter = createDatabaseAdapter(
        connection.type,
        connection.connectionString
      );
      const isConnected = await adapter.testConnection();

      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === id
            ? { ...conn, isConnected, lastTested: new Date() }
            : conn
        )
      );

      if (!isConnected) {
        await adapter.disconnect();
      }

      return isConnected;
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === id
            ? { ...conn, isConnected: false, lastTested: new Date() }
            : conn
        )
      );
      return false;
    }
  };

  const handleSelectConnection = async (connection: DatabaseConnection) => {
    setIsConnecting(true);
    setQueryError(null);

    try {
      // Disconnect current adapter if exists
      if (currentAdapter) {
        await currentAdapter.disconnect();
      }

      const adapter = createDatabaseAdapter(
        connection.type,
        connection.connectionString
      );
      const connected = await adapter.connect();

      if (connected) {
        setCurrentAdapter(adapter);
        setSelectedConnection(connection);
        setShowConnections(false);

        // Load tables
        const tableList = await adapter.getTables();
        setTables(tableList);

        if (tableList.length > 0) {
          setSelectedTable(tableList[0].name);
          await loadTableData(tableList[0].name, adapter);
        }

        // Update connection status
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === connection.id ? { ...conn, isConnected: true } : conn
          )
        );

        setFileName(connection.name);
        setFileSize(`(${connection.type.toUpperCase()})`);
      } else {
        setQueryError("Failed to connect to database");
      }
    } catch (error: any) {
      setQueryError(`Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (currentAdapter) {
      await currentAdapter.disconnect();
      setCurrentAdapter(null);
    }
    setSelectedConnection(null);
    setTables([]);
    setSelectedTable("");
    setQueryResults(null);
    setFileName("");
    setFileSize("");
    setPage(1);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setQueryError(null);

    try {
      // Disconnect current adapter if exists
      if (currentAdapter) {
        await currentAdapter.disconnect();
      }

      const adapter = new SQLiteAdapter("sqlite://local");
      const loaded = await adapter.loadFromFile(file);

      if (loaded) {
        setCurrentAdapter(adapter);
        setFileName(file.name);
        setFileSize(`(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

        const tableList = await adapter.getTables();
        setTables(tableList);

        if (tableList.length > 0) {
          setSelectedTable(tableList[0].name);
          await loadTableData(tableList[0].name, adapter);
        }
      } else {
        setQueryError("Failed to load SQLite file");
      }
    } catch (error: any) {
      setQueryError(`Error loading file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableData = useCallback(
    async (tableName: string, adapter = currentAdapter) => {
      if (!adapter) return;

      setIsLoading(true);
      try {
        const query = `SELECT * FROM ${tableName} LIMIT 10 OFFSET ${
          (page - 1) * 10
        }`;
        const results = await adapter.executeQuery(query);
        setQueryResults(results);
        setQueryError(null);
      } catch (error: any) {
        setQueryError(error.message);
        setQueryResults(null);
      } finally {
        setIsLoading(false);
      }
    },
    [currentAdapter, page]
  );

  const executeQuery = async () => {
    if (!currentAdapter) {
      setQueryError("Please connect to a database first");
      return;
    }

    if (!sqlQuery.trim()) {
      setQueryError("Please enter a SQL query");
      return;
    }

    setIsLoading(true);
    try {
      const results = await currentAdapter.executeQuery(sqlQuery);
      setQueryResults(results);
      setQueryError(null);
    } catch (error: any) {
      setQueryError(error.message);
      setQueryResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    loadTableData(tableName);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  useEffect(() => {
    if (selectedTable && currentAdapter) {
      loadTableData(selectedTable);
    }
  }, [page, selectedTable, currentAdapter, loadTableData]);

  const getConnectionTypeBadge = (type: string) => {
    const colors = {
      postgresql: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      mysql: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      sqlite: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return (
      colors[type as keyof typeof colors] ||
      "bg-gray-500/10 text-gray-500 border-gray-500/20"
    );
  };

  if (showConnections) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <main className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-2xl font-bold">
              Database Viewer Pro
            </h1>
            <Button variant="outline" onClick={() => setShowConnections(false)}>
              Back to Viewer
            </Button>
          </div>
          <ConnectionManager
            connections={connections}
            onAddConnection={handleAddConnection}
            onDeleteConnection={handleDeleteConnection}
            onTestConnection={handleTestConnection}
            onSelectConnection={handleSelectConnection}
            selectedConnectionId={selectedConnection?.id}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <main className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-2xl font-bold">
              Database Viewer Pro
            </h1>
            {selectedConnection && (
              <div className="flex items-center gap-2">
                <Badge
                  className={getConnectionTypeBadge(selectedConnection.type)}
                >
                  {selectedConnection.type.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedConnection.name}
                </span>
              </div>
            )}
            {fileName && !selectedConnection && (
              <span className="text-sm text-muted-foreground">
                {fileName} <span className="text-xs">{fileSize}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentAdapter && (
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowConnections(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Connections
            </Button>
          </div>
        </div>

        {isConnecting && (
          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to database...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!currentAdapter && !isConnecting ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Database className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-serif text-lg font-semibold mb-2">
                      Get Started
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Connect to a database or upload a SQLite file to begin
                      exploring your data.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => setShowConnections(true)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Connect Database
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".db,.sqlite"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload SQLite File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : currentAdapter ? (
          <div className="space-y-4">
            {/* Table Selection */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-lg">Tables</CardTitle>
                  <Select
                    value={selectedTable}
                    onValueChange={handleTableSelect}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.name} value={table.name}>
                          {table.name} ({table.rowCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {/* Enhanced Table Viewer */}
            <EnhancedTableViewer
              data={queryResults}
              isLoading={isLoading}
              page={page}
              onPageChange={handlePageChange}
              // ...existing code...
            />

            {/* Query Execution */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  Execute Query
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter your SQL query here..."
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="min-h-[100px] font-mono"
                  />
                  <Button
                    onClick={executeQuery}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 w-4 h-4" />
                    )}
                    Execute Query
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {queryError && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            Error: {queryError}
          </div>
        )}
      </main>
    </div>
  );
}
