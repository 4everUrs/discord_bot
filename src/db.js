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

function parseGradeValue(value, fieldName) {
  if (value == null || value === "") {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid ${fieldName} value: ${value}`);
  }

  return numericValue;
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
         WHERE e2.student_id = s.student_id
         ORDER BY EXISTS (
           SELECT 1
           FROM Grades AS g2
           WHERE g2.enrollment_id = e2.enrollment_id
         ) DESC,
                  e2.enrollment_date DESC,
                  e2.enrollment_id DESC
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

async function importStudentRecords(records) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const record of records) {
      const studentId = String(record.student_id || "").trim();
      const firstName = String(record.first_name || "").trim();
      const lastName = String(record.last_name || "").trim();
      const className = String(record.class_name || "").trim();
      const section = String(record.section || "").trim();
      const email = record.email == null ? null : String(record.email).trim() || null;
      const enrollmentDate = String(record.enrollment_date || "").trim();

      if (!studentId || !firstName || !lastName || !className || !section || !enrollmentDate) {
        throw new Error(
          "Each enrollment record must include student_id, first_name, last_name, class_name, section, and enrollment_date."
        );
      }

      const [studentRows] = await connection.execute(
        `SELECT id, student_id
         FROM Students
         WHERE student_id = ?
         LIMIT 1`,
        [studentId]
      );

      let internalStudentId;
      let enrollmentStudentId;

      if (studentRows[0]) {
        internalStudentId = studentRows[0].id;
        enrollmentStudentId = studentRows[0].student_id;
        await connection.execute(
          `UPDATE Students
           SET first_name = ?, last_name = ?, email = ?
           WHERE id = ?`,
          [firstName, lastName, email, internalStudentId]
        );
      } else {
        const [studentResult] = await connection.execute(
          `INSERT INTO Students (student_id, first_name, last_name, email)
           VALUES (?, ?, ?, ?)`,
          [studentId, firstName, lastName, email]
        );
        internalStudentId = studentResult.insertId;
        enrollmentStudentId = studentId;
      }

      const [classRows] = await connection.execute(
        `SELECT class_id
         FROM Classes
         WHERE class_name = ? AND section = ?
         LIMIT 1`,
        [className, section]
      );

      let classId = classRows[0]?.class_id;

      if (!classId) {
        const [classResult] = await connection.execute(
          `INSERT INTO Classes (class_name, section)
           VALUES (?, ?)`,
          [className, section]
        );
        classId = classResult.insertId;
      }

      const [enrollmentRows] = await connection.execute(
        `SELECT enrollment_id
         FROM Enrollments
         WHERE student_id = ? AND class_id = ?
         ORDER BY enrollment_id DESC
         LIMIT 1`,
        [enrollmentStudentId, classId]
      );

      let enrollmentId = enrollmentRows[0]?.enrollment_id;

      if (enrollmentId) {
        await connection.execute(
          `UPDATE Enrollments
           SET enrollment_date = ?
           WHERE enrollment_id = ?`,
          [enrollmentDate, enrollmentId]
        );
      } else {
        const [enrollmentResult] = await connection.execute(
          `INSERT INTO Enrollments (student_id, class_id, enrollment_date)
           VALUES (?, ?, ?)`,
          [enrollmentStudentId, classId, enrollmentDate]
        );
        enrollmentId = enrollmentResult.insertId;
      }
    }

    await connection.commit();
    return { imported: records.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function importGradeRecords(records, gradeColumn) {
  const allowedGradeColumns = new Set(["prelim", "midterm", "finals"]);

  if (!allowedGradeColumns.has(gradeColumn)) {
    throw new Error("Invalid grade column.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const record of records) {
      const studentId = String(record.student_id || "").trim();
      const subjectName = String(record.subject_name || "").trim();
      const rawGradeValue = record[gradeColumn] ?? record.grade;
      const gradeValue = parseGradeValue(rawGradeValue, gradeColumn);

      if (!studentId || !subjectName || gradeValue == null) {
        throw new Error(
          `Each ${gradeColumn} record must include student_id, subject_name, and ${gradeColumn} (or grade).`
        );
      }

      const [studentRows] = await connection.execute(
        `SELECT student_id
         FROM Students
         WHERE student_id = ?
         LIMIT 1`,
        [studentId]
      );

      if (!studentRows[0]) {
        throw new Error(`Student ID not found: ${studentId}`);
      }

      const [enrollmentRows] = await connection.execute(
        `SELECT enrollment_id
         FROM Enrollments
         WHERE student_id = ?
         ORDER BY enrollment_date DESC, enrollment_id DESC
         LIMIT 1`,
        [studentId]
      );

      const enrollmentId = enrollmentRows[0]?.enrollment_id;

      if (!enrollmentId) {
        throw new Error(`No enrollment found for student ID: ${studentId}`);
      }

      const [subjectRows] = await connection.execute(
        `SELECT subject_id
         FROM Subjects
         WHERE subject_name = ?
         LIMIT 1`,
        [subjectName]
      );

      let subjectId = subjectRows[0]?.subject_id;

      if (!subjectId) {
        const [subjectResult] = await connection.execute(
          `INSERT INTO Subjects (subject_name)
           VALUES (?)`,
          [subjectName]
        );
        subjectId = subjectResult.insertId;
      }

      await connection.execute(
        `INSERT INTO Grades (enrollment_id, subject_id, prelim, midterm, finals)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           ${gradeColumn} = VALUES(${gradeColumn})`,
        [
          enrollmentId,
          subjectId,
          gradeColumn === "prelim" ? gradeValue : null,
          gradeColumn === "midterm" ? gradeValue : null,
          gradeColumn === "finals" ? gradeValue : null
        ]
      );
    }

    await connection.commit();
    return { imported: records.length, gradeColumn };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
  importStudentRecords,
  importGradeRecords,
  close
};
