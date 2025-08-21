/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Upload, Play, ChevronLeft, ChevronRight } from "lucide-react";
// @ts-ignore
// Removed unused sqlWasmUrl import

interface TableInfo {
  name: string;
  columns: string[];
  rowCount: number;
}

export default function SQLiteViewer() {
  const [db, setDb] = useState<any | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [queryResults, setQueryResults] = useState<{
    columns: string[];
    values: any[][];
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOnLoadExample = async () => {
    try {
      // Dynamic import to avoid fs module issues
      const { default: initSqlJs } = await import("sql.js");
      // @ts-ignore - WASM file import
      const sqlWasmUrl = (await import("sql.js/dist/sql-wasm.wasm")).default;

      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl,
      });

      const response = await fetch("/Example.sqlite");
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const newDb = new SQL.Database(uint8Array);

      setFileName("Example.sqlite");
      setFileSize(
        `(${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB)`
      );
      setDb(newDb);
      const tableInfo = getTables(newDb);
      setTables(tableInfo);
      if (tableInfo.length > 0) {
        setSelectedTable(tableInfo[0].name);
        loadTableData(tableInfo[0].name, newDb);
      }
    } catch (error) {
      console.error("Error loading example database:", error);
      setQueryError("Error loading example database. Please try again.");
    }
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // ...existing code...
  const getTables = (db: any) => {
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table'"
    )[0];
    if (!tables) return [];

    return tables.values.map((table: any[]) => {
      const tableName = table[0];
      const columns = db
        .exec(`PRAGMA table_info(${tableName})`)[0]
        .values.map((col: any[]) => col[1]);
      const rowCount = db.exec(`SELECT COUNT(*) FROM ${tableName}`)[0]
        .values[0][0];
      return { name: tableName, columns, rowCount };
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Dynamic import to avoid fs module issues
      const { default: initSqlJs } = await import("sql.js");
      // @ts-ignore - WASM file import
      const sqlWasmUrl = (await import("sql.js/dist/sql-wasm.wasm")).default;

      const SQL = await initSqlJs({
        locateFile: () => sqlWasmUrl,
      });
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const newDb = new SQL.Database(uint8Array);

      setFileName(file.name);
      setFileSize(`(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      setDb(newDb);
      const tableInfo = getTables(newDb);
      setTables(tableInfo);
      if (tableInfo.length > 0) {
        setSelectedTable(tableInfo[0].name);
        loadTableData(tableInfo[0].name, newDb);
      }
    } catch (error) {
      console.error("Error loading database:", error);
      setQueryError("Error loading database. Please try again.");
    }
  };

  const loadTableData = (tableName: string, database = db) => {
    try {
      let query = `SELECT * FROM ${tableName}`;
      const filterClauses = Object.entries(filters)
        .filter(([, value]) => value)
        .map(([column, value]) => `${column} LIKE '%${value}%'`);

      if (filterClauses.length > 0) {
        query += ` WHERE ${filterClauses.join(" AND ")}`;
      }

      query += ` LIMIT 10 OFFSET ${(page - 1) * 10}`;

      const results = database.exec(query);
      setQueryResults(results[0] || null);
      setQueryError(null);
    } catch (error: any) {
      setQueryError(error.message);
      setQueryResults(null);
    }
  };

  const executeQuery = () => {
    if (!db) {
      setQueryError("Please upload a SQLite database first");
      return;
    }

    try {
      const results = db.exec(sqlQuery);
      setQueryResults(results[0] || null);
      setQueryError(null);
    } catch (error: any) {
      setQueryError(error.message);
      setQueryResults(null);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setFilters({});
    setPage(1);
    loadTableData(tableName);
  };

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  }, [page, loadTableData, selectedTable]);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white p-6">
      <main className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {fileName && (
              <h1 className="text-lg font-medium">
                {fileName} <span className="text-gray-400">{fileSize}</span>
              </h1>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={handleOnLoadExample}
            className="w-auto"
          >
            Load Example Database
          </Button>
        </div>

        {!db ? (
          <Card className="w-full bg-[#12141a] border-gray-800">
            <CardContent className="p-6">
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
                className="w-full"
              >
                <Upload className="mr-2 w-4 h-4" /> Upload SQLite Database
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="w-full bg-[#12141a] border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">
                  <Select
                    value={selectedTable}
                    onValueChange={handleTableSelect}
                  >
                    <SelectTrigger className="w-[200px] bg-transparent border-gray-800">
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryResults && (
                  <div className="space-y-4">
                    <div className="rounded-md border border-gray-800">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-800">
                            {queryResults.columns.map((column, idx) => (
                              <TableHead key={idx} className="text-gray-400">
                                <div className="space-y-2">
                                  <div>{column}</div>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResults.values.map((row, rowIdx) => (
                            <TableRow key={rowIdx} className="border-gray-800">
                              {row.map((cell, cellIdx) => (
                                <TableCell key={cellIdx} className="font-mono">
                                  {cell !== null ? (
                                    String(cell)
                                  ) : (
                                    <span className="italic text-gray-500">
                                      NULL
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-gray-400">Page {page}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="w-full bg-[#12141a] border-gray-800">
              <CardHeader>
                <CardTitle className="text-base font-normal">
                  Execute Query
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter your SQL query here..."
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="min-h-[100px] bg-transparent border-gray-800"
                  />
                  <Button onClick={executeQuery} className="w-full">
                    <Play className="mr-2 w-4 h-4" /> Execute Query
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {queryError && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
            Error: {queryError}
          </div>
        )}
      </main>
    </div>
  );
}
