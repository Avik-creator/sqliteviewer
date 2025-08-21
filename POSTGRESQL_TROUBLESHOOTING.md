# PostgreSQL Connection Troubleshooting

## Common PostgreSQL Case Sensitivity Issues

### Problem

PostgreSQL is case-sensitive with quoted identifiers and folds unquoted identifiers to lowercase.

### Solutions Implemented

1. **Smart Query API** (`/api/database/smart-query`)

   - Automatically detects table names in your SQL queries
   - Finds the correct case for table names in your database
   - Rewrites queries with proper quoting

2. **Enhanced Table Discovery** (`/api/database/tables`)
   - Uses `pg_class` instead of `information_schema` for accurate case handling
   - Provides fallback mechanisms for row counting

### Usage Examples

#### If your table is named "Chat" (with capital C):

```sql
-- This will fail:
SELECT * FROM chat

-- This will work:
SELECT * FROM "Chat"

-- Or use our smart query API (it auto-fixes this)
SELECT * FROM chat  -- Gets converted to: SELECT * FROM "Chat"
```

#### Common PostgreSQL Table Naming Conventions:

- Tables created without quotes: `chat` (stored as lowercase)
- Tables created with quotes: `"Chat"` (stored with exact case)
- Tables with mixed case: `"MyTable"` (must always be quoted)

### Manual Debugging Steps

1. **Check actual table names in your Neon database:**

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

2. **Check table case using pg_class:**

```sql
SELECT c.relname as table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';
```

3. **If you need to query a mixed-case table:**

```sql
-- Always use double quotes for exact case matching
SELECT * FROM "MyTable";
```

### Connection String Format for Neon

```
postgresql://username:password@host/database?sslmode=require&channel_binding=require
```

The implementation now handles these issues automatically!
