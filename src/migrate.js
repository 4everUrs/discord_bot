require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function runMigration(options = {}) {
  const { onlyIfDatabaseMissing = false } = options;
  const host = process.env.MYSQL_HOST || "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "discord_bot";
  const schemaFile = process.env.SCHEMA_FILE || "./data/schema.sql";
  const resolvedSchemaFile = path.resolve(schemaFile);

  if (!fs.existsSync(resolvedSchemaFile)) {
    throw new Error(`Schema file not found: ${resolvedSchemaFile}`);
  }

  const rawSql = fs.readFileSync(resolvedSchemaFile, "utf8");
  const idempotentSql = rawSql.replace(/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/gi, "CREATE TABLE IF NOT EXISTS ");

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    const [databaseRows] = await connection.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1",
      [database]
    );
    const databaseExists = databaseRows.length > 0;

    if (onlyIfDatabaseMissing && databaseExists) {
      return false;
    }

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${escapeIdentifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${escapeIdentifier(database)}`);
    await connection.query(idempotentSql);

    console.log(`Migration applied successfully from ${resolvedSchemaFile}`);
    return true;
  } finally {
    await connection.end();
  }
}

module.exports = {
  runMigration
};

if (require.main === module) {
  runMigration().catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  });
}
