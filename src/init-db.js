require("dotenv").config();
const { run, ensureSchema, close } = require("./db");

async function initDb() {
  await ensureSchema();

  // Replace custom_id values with your real student/custom IDs.
  await run(
    `INSERT INTO user_data (custom_id, full_name, email, plan, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       email = VALUES(email),
       plan = VALUES(plan),
       updated_at = NOW()`,
    ["18016062", "Alice Example", "alice@example.com", "Pro"]
  );

  await run(
    `INSERT INTO user_data (custom_id, full_name, email, plan, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       email = VALUES(email),
       plan = VALUES(plan),
       updated_at = NOW()`,
    ["18016063", "Bob Example", "bob@example.com", "Free"]
  );
}

(async () => {
  try {
    await initDb();
    console.log("Database initialized.");
  } catch (error) {
    console.error("Failed to initialize DB:", error);
    process.exitCode = 1;
  } finally {
    await close();
  }
})();
