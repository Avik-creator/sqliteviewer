"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Copy,
} from "lucide-react";
import type { QueryResult } from "@/lib/databaseAdapters";

interface EnhancedTableViewerProps {
  data: QueryResult | null;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  // onRefresh: () => void; // Removed unused prop
}

type SortDirection = "asc" | "desc" | null;
type DataType = "string" | "number" | "boolean" | "date" | "null";

interface ColumnFilter {
  column: string;
  value: string;
}

export default function EnhancedTableViewer({
  data,
  isLoading,
  page,
  onPageChange,
}: EnhancedTableViewerProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Detect data type for each column
  const getDataType = (value: unknown): DataType => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (typeof value === "string") {
      // Check if it's a date
      const dateRegex = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/;
      if (dateRegex.test(value)) return "date";
      return "string";
    }
    return "string";
  };

  // Get column metadata
  const columnMetadata = useMemo(() => {
    if (!data || !data.values.length) return {};

    const metadata: Record<string, { type: DataType; nullable: boolean }> = {};

    data.columns.forEach((column, colIndex) => {
      const columnValues = data.values.map((row) => row[colIndex]);
      const types = columnValues.map(getDataType);
      const hasNull = types.includes("null");
      const nonNullTypes = types.filter((t) => t !== "null");
      const primaryType = nonNullTypes.length > 0 ? nonNullTypes[0] : "null";

      metadata[column] = {
        type: primaryType,
        nullable: hasNull,
      };
    });

    return metadata;
  }, [data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data) return null;

    let filteredRows = data.values.map((row, index) => ({
      row,
      originalIndex: index,
    }));

    // Apply global search
    if (globalSearch) {
      filteredRows = filteredRows.filter(({ row }) =>
        row.some((cell) =>
          String(cell || "")
            .toLowerCase()
            .includes(globalSearch.toLowerCase())
        )
      );
    }

    // Apply column filters
    columnFilters.forEach(({ column, value }) => {
      if (!value) return;
      const columnIndex = data.columns.indexOf(column);
      if (columnIndex === -1) return;

      filteredRows = filteredRows.filter(({ row }) =>
        String(row[columnIndex] || "")
          .toLowerCase()
          .includes(value.toLowerCase())
      );
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      const columnIndex = data.columns.indexOf(sortColumn);
      if (columnIndex !== -1) {
        filteredRows.sort(({ row: a }, { row: b }) => {
          const aVal = a[columnIndex];
          const bVal = b[columnIndex];

          if (aVal === null && bVal === null) return 0;
          if (aVal === null) return sortDirection === "asc" ? -1 : 1;
          if (bVal === null) return sortDirection === "asc" ? 1 : -1;

          const comparison = String(aVal).localeCompare(
            String(bVal),
            undefined,
            { numeric: true }
          );
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }
    }

    return {
      columns: data.columns,
      values: filteredRows.map(({ row }) => row),
      totalRows: filteredRows.length,
    };
  }, [data, globalSearch, columnFilters, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : sortDirection === "desc"
          ? null
          : "asc"
      );
      if (sortDirection === "desc") {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev.find((f) => f.column === column);
      if (existing) {
        if (!value) {
          return prev.filter((f) => f.column !== column);
        }
        return prev.map((f) => (f.column === column ? { ...f, value } : f));
      }
      return value ? [...prev, { column, value }] : prev;
    });
  };

  const handleSelectRow = (rowIndex: number, checked: boolean) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowIndex);
      } else {
        newSet.delete(rowIndex);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && processedData) {
      setSelectedRows(
        new Set(
          Array.from({ length: processedData.values.length }, (_, i) => i)
        )
      );
    } else {
      setSelectedRows(new Set());
    }
  };

  const exportData = (format: "csv" | "json") => {
    if (!processedData) return;

    const selectedData =
      selectedRows.size > 0
        ? processedData.values.filter((_, index) => selectedRows.has(index))
        : processedData.values;

    if (format === "csv") {
      const csvContent = [
        processedData.columns.join(","),
        ...selectedData.map((row) =>
          row.map((cell) => `"${String(cell || "")}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "table-data.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "json") {
      const jsonData = selectedData.map((row) => {
        const obj: Record<string, unknown> = {};
        processedData.columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "table-data.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const copyToClipboard = (value: unknown) => {
    navigator.clipboard.writeText(String(value ?? ""));
  };

  const getTypeColor = (type: DataType) => {
    switch (type) {
      case "string":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "number":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "boolean":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "date":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column)
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="w-4 h-4" />;
    if (sortDirection === "desc") return <ArrowDown className="w-4 h-4" />;
    return <ArrowUpDown className="w-4 h-4 opacity-50" />;
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">Table Data</CardTitle>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <Badge variant="secondary">{selectedRows.size} selected</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportData("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData("json")}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search across all columns..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Column Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              {data.columns.map((column) => (
                <div key={column} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{column}</label>
                    {columnMetadata[column] && (
                      <Badge
                        className={`text-xs ${getTypeColor(
                          columnMetadata[column].type
                        )}`}
                      >
                        {columnMetadata[column].type}
                      </Badge>
                    )}
                  </div>
                  <Input
                    placeholder={`Filter ${column}...`}
                    value={
                      columnFilters.find((f) => f.column === column)?.value ||
                      ""
                    }
                    onChange={(e) => handleColumnFilter(column, e.target.value)}
                    size={12}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : processedData ? (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedRows.size === processedData.values.length &&
                          processedData.values.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    {processedData.columns.map((column) => (
                      <TableHead key={column} className="font-serif">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort(column)}
                            className="h-auto p-0 font-serif hover:bg-transparent"
                          >
                            <span>{column}</span>
                            {getSortIcon(column)}
                          </Button>
                          {columnMetadata[column] && (
                            <Badge
                              className={`text-xs ${getTypeColor(
                                columnMetadata[column].type
                              )}`}
                            >
                              {columnMetadata[column].type}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedData.values.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      className={
                        selectedRows.has(rowIndex) ? "bg-muted/50" : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(rowIndex)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(rowIndex, checked as boolean)
                          }
                        />
                      </TableCell>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="font-mono">
                          <div className="flex items-center gap-2">
                            {cell !== null ? (
                              <span
                                className="truncate max-w-xs"
                                title={String(cell)}
                              >
                                {String(cell)}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground">
                                NULL
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(cell)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => console.log("View row:", row)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                copyToClipboard(JSON.stringify(row))
                              }
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Row
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination and Stats */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {processedData.values.length} of{" "}
                {processedData.totalRows} rows
                {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(page + 1)}
                  disabled={isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
