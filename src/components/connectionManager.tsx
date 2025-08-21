"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Plus,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
} from "lucide-react";

export interface DatabaseConnection {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "sqlite";
  connectionString: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  isConnected: boolean;
  lastTested?: Date;
}

interface ConnectionManagerProps {
  connections: DatabaseConnection[];
  onAddConnection: (
    connection: Omit<DatabaseConnection, "id" | "isConnected" | "lastTested">
  ) => void;
  onDeleteConnection: (id: string) => void;
  onTestConnection: (id: string) => Promise<boolean>;
  onSelectConnection: (connection: DatabaseConnection) => void;
  selectedConnectionId?: string;
}

export default function ConnectionManager({
  connections,
  onAddConnection,
  onDeleteConnection,
  onTestConnection,
  onSelectConnection,
  selectedConnectionId,
}: ConnectionManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newConnection, setNewConnection] = useState<{
    name: string;
    type: "postgresql" | "mysql" | "sqlite";
    connectionString: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }>({
    name: "",
    type: "postgresql",
    connectionString: "",
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
  });
  const [useConnectionString, setUseConnectionString] = useState(true);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(
    new Set()
  );

  const handleAddConnection = () => {
    if (
      !newConnection.name ||
      (!useConnectionString && (!newConnection.host || !newConnection.database))
    ) {
      return;
    }

    onAddConnection({
      ...newConnection,
      connectionString: useConnectionString
        ? newConnection.connectionString
        : buildConnectionString(newConnection),
    });

    // Reset form
    setNewConnection({
      name: "",
      type: "postgresql",
      connectionString: "",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
    });
    setIsDialogOpen(false);
  };

  const buildConnectionString = (conn: typeof newConnection) => {
    switch (conn.type) {
      case "postgresql":
        return `postgresql://${conn.username}:${conn.password}@${conn.host}:${conn.port}/${conn.database}`;
      case "mysql":
        return `mysql://${conn.username}:${conn.password}@${conn.host}:${conn.port}/${conn.database}`;
      case "sqlite":
        return `sqlite://${conn.database}`;
      default:
        return "";
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingConnections((prev) => new Set(prev).add(id));
    try {
      await onTestConnection(id);
    } finally {
      setTestingConnections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "postgresql":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "mysql":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "sqlite":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold">Database Connections</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">
                Add Database Connection
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  value={newConnection.name}
                  onChange={(e) =>
                    setNewConnection((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="My Database"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Database Type</Label>
                <Select
                  value={newConnection.type}
                  onValueChange={(value: "postgresql" | "mysql" | "sqlite") =>
                    setNewConnection((prev) => ({
                      ...prev,
                      type: value,
                      port:
                        value === "postgresql"
                          ? 5432
                          : value === "mysql"
                          ? 3306
                          : 0,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useConnectionString"
                  checked={useConnectionString}
                  onChange={(e) => setUseConnectionString(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="useConnectionString">
                  Use connection string
                </Label>
              </div>

              {useConnectionString ? (
                <div className="space-y-2">
                  <Label htmlFor="connectionString">Connection String</Label>
                  <Input
                    id="connectionString"
                    value={newConnection.connectionString}
                    onChange={(e) =>
                      setNewConnection((prev) => ({
                        ...prev,
                        connectionString: e.target.value,
                      }))
                    }
                    placeholder="postgresql://user:pass@host:5432/dbname"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="host">Host</Label>
                      <Input
                        id="host"
                        value={newConnection.host}
                        onChange={(e) =>
                          setNewConnection((prev) => ({
                            ...prev,
                            host: e.target.value,
                          }))
                        }
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={newConnection.port}
                        onChange={(e) =>
                          setNewConnection((prev) => ({
                            ...prev,
                            port: Number.parseInt(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="database">Database</Label>
                    <Input
                      id="database"
                      value={newConnection.database}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          database: e.target.value,
                        }))
                      }
                      placeholder="mydb"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newConnection.username}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      placeholder="user"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newConnection.password}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="password"
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleAddConnection} className="w-full">
                Add Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Database className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No database connections yet. Add your first connection to get
                started.
              </p>
            </CardContent>
          </Card>
        ) : (
          connections.map((connection) => (
            <Card
              key={connection.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedConnectionId === connection.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => onSelectConnection(connection)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-lg">
                    {connection.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(connection.type)}>
                      {connection.type.toUpperCase()}
                    </Badge>
                    {connection.isConnected ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-mono truncate flex-1 mr-4">
                    {connection.connectionString}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestConnection(connection.id);
                      }}
                      disabled={testingConnections.has(connection.id)}
                    >
                      <TestTube className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConnection(connection.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {connection.lastTested && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last tested: {connection.lastTested.toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
