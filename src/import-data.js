require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ensureSchema, importStudentRecords, importGradeRecords, close } = require("./db");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    args[key] = value;
    index += 1;
  }

  return args;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
}

function parsePayload(payload, filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".json") {
    const json = JSON.parse(payload);

    if (!Array.isArray(json)) {
      throw new Error("JSON file must contain an array of records.");
    }

    return json;
  }

  if (extension === ".csv") {
    const records = parseCsv(payload);

    if (!records.length) {
      throw new Error("CSV file must include headers and at least one row.");
    }

    return records;
  }

  throw new Error("Unsupported file type. Use .json or .csv.");
}

function printUsage() {
  console.log("Usage: node src/import-data.js --mode <full|prelim|midterm|finals> --file <path>");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode || "").trim().toLowerCase();
  const filePath = String(args.file || "").trim();

  if (!mode || !filePath) {
    printUsage();
    throw new Error("Missing required arguments.");
  }

  if (!["full", "prelim", "midterm", "finals"].includes(mode)) {
    throw new Error("Mode must be one of: full, prelim, midterm, finals.");
  }

  const resolvedFilePath = path.resolve(filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(`File not found: ${resolvedFilePath}`);
  }

  const payload = fs.readFileSync(resolvedFilePath, "utf8");
  const records = parsePayload(payload, resolvedFilePath);

  if (!records.length) {
    throw new Error("No records found in the import file.");
  }

  await ensureSchema();

  const result =
    mode === "full"
      ? await importStudentRecords(records)
      : await importGradeRecords(records, mode);

  console.log(`Imported ${result.imported} record${result.imported === 1 ? "" : "s"} using mode "${mode}".`);
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error("Import failed:", error.message);
    process.exitCode = 1;
  } finally {
    await close();
  }
})();
