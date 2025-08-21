# Multi-Database Support

Your SQLite Viewer now supports **PostgreSQL**, **MySQL**, and **SQLite** databases!

## ✅ **Supported Database Types**

### 1. **PostgreSQL** (including Neon, Supabase, AWS RDS, etc.)

```
postgresql://username:password@host:port/database?sslmode=require
```

**Example with your Neon database:**

```
postgresql://neondb_owner:npg_2dkUqiDXoh9Z@ep-flat-cake-a1uxjru2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 2. **MySQL** (including PlanetScale, AWS RDS, DigitalOcean, etc.)

```
mysql://username:password@host:port/database
```

**Example:**

```
mysql://user:password@mysql.example.com:3306/mydatabase
```

### 3. **SQLite** (file-based databases)

```
sqlite:///path/to/database.sqlite
```

**Example:**

```
sqlite://Example.sqlite
```

## 🔧 **Features Implemented**

- **Universal Connection API**: All database types use the same connection interface
- **Automatic Database Type Detection**: Detects database type from connection string
- **Case-Sensitive Query Handling**: PostgreSQL table names handled properly
- **Real Database Connectivity**: No more mock data - connects to actual databases
- **Table Discovery**: Lists all tables with proper column information and row counts
- **Query Execution**: Supports SELECT, INSERT, UPDATE, DELETE operations

## 🚀 **How to Use**

1. **Open your application in the browser**
2. **Click on "Add Connection" or the database settings**
3. **Select your database type** (PostgreSQL, MySQL, or SQLite)
4. **Enter your connection string**
5. **Test the connection**
6. **Browse tables and run queries!**

## 📊 **Connection String Examples**

### PostgreSQL (Neon)

```
postgresql://neondb_owner:npg_2dkUqiDXoh9Z@ep-flat-cake-a1uxjru2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### MySQL (PlanetScale)

```
mysql://username:password@aws.connect.psdb.cloud:3306/database_name
```

### SQLite (Local File)

```
sqlite://public/Example.sqlite
```

## 🔥 **Smart Features**

- **PostgreSQL Case Sensitivity**: Automatically handles table names like "Chat" vs "chat"
- **Connection Pooling**: Efficient database connections with proper cleanup
- **Error Handling**: Detailed error messages for troubleshooting
- **Type Safety**: Full TypeScript support with proper typing

## 🐛 **Troubleshooting**

1. **"relation does not exist" error**: Your table names might have different casing - the app handles this automatically
2. **Connection timeout**: Check your connection string and network access
3. **SSL errors**: Make sure SSL settings are correct in your connection string
4. **Permission errors**: Verify your database user has proper permissions

Your Neon PostgreSQL database should now work perfectly! 🎉
