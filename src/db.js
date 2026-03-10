const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "discord_bot",
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

async function get(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

async function all(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function ensureSchema() {
  const schemaFile = path.resolve(process.env.SCHEMA_FILE || "./data/schema.sql");

  if (!fs.existsSync(schemaFile)) {
    throw new Error(`Schema file not found: ${schemaFile}`);
  }

  const rawSql = fs.readFileSync(schemaFile, "utf8");
  const idempotentSql = rawSql.replace(
    /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/gi,
    "CREATE TABLE IF NOT EXISTS "
  );

  await pool.query(idempotentSql);
}

async function findUserDataByCustomId(customId) {
  const student = await get(
    `SELECT
       s.id,
       s.student_id,
       s.first_name AS firstname,
       s.last_name AS lastname,
       s.email,
       e.enrollment_id,
       c.section,
       c.class_name,
       e.enrollment_date
     FROM Students AS s
     LEFT JOIN Enrollments AS e
       ON e.enrollment_id = (
         SELECT e2.enrollment_id
         FROM Enrollments AS e2
         WHERE e2.student_id = s.id
         ORDER BY e2.enrollment_date DESC, e2.enrollment_id DESC
         LIMIT 1
       )
     LEFT JOIN Classes AS c
       ON c.class_id = e.class_id
     WHERE s.student_id = ?`,
    [customId]
  );

  if (!student) {
    return null;
  }

  const grades = student.enrollment_id
    ? await all(
        `SELECT
           sub.subject_name,
           g.prelim,
           g.midterm,
           g.finals
         FROM Grades AS g
         INNER JOIN Subjects AS sub
           ON sub.subject_id = g.subject_id
         WHERE g.enrollment_id = ?
         ORDER BY sub.subject_name ASC, g.grade_id ASC`,
        [student.enrollment_id]
      )
    : [];

  return {
    ...student,
    grades
  };
}

async function close() {
  await pool.end();
}

module.exports = {
  run,
  get,
  all,
  ensureSchema,
  findUserDataByCustomId,
  close
};
