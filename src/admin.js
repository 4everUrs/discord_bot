require("dotenv").config();
const http = require("http");
const { ensureSchema, importStudentRecords, importGradeRecords, close } = require("./db");

const port = Number(process.env.PORT || process.env.ADMIN_PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

function renderPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Import Desk</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f0f13;
      --surface: #18181f;
      --surface2: #111117;
      --border: rgba(255,255,255,0.07);
      --accent: #c8a96e;
      --accent2: #e8c98e;
      --text: #f0ede6;
      --muted: #7a7880;
      --dim: #55535f;
      --success: #5dba8a;
      --error: #e07070;
    }

    body {
      min-height: 100vh;
      background: var(--bg);
      font-family: "DM Sans", sans-serif;
      color: var(--text);
      padding: 52px 24px 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .header {
      width: 100%;
      max-width: 720px;
      margin-bottom: 36px;
    }

    .header-top {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 10px;
    }

    .header-icon {
      width: 46px;
      height: 46px;
      background: linear-gradient(135deg, rgba(200,169,110,0.12), rgba(200,169,110,0.28));
      border: 1px solid rgba(200,169,110,0.3);
      border-radius: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      flex-shrink: 0;
    }

    h1 {
      font-family: "Playfair Display", serif;
      font-size: 32px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
      line-height: 1.1;
    }

    .header-sub {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.65;
      max-width: 520px;
    }

    .header-sub code {
      font-family: "DM Mono", monospace;
      font-size: 12.5px;
      color: var(--accent2);
    }

    .card {
      width: 100%;
      max-width: 720px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
    }

    .section {
      padding: 26px 28px;
    }

    .divider {
      height: 1px;
      background: var(--border);
    }

    .label {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 12px;
    }

    .upload-row {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .drop-zone {
      width: 178px;
      flex-shrink: 0;
      border: 1.5px dashed rgba(200,169,110,0.25);
      border-radius: 12px;
      padding: 20px 14px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: rgba(200,169,110,0.02);
      user-select: none;
    }

    .drop-zone:hover,
    .drop-zone.dragging {
      border-color: rgba(200,169,110,0.55);
      background: rgba(200,169,110,0.07);
    }

    .drop-icon {
      font-size: 24px;
      margin-bottom: 8px;
      display: block;
      color: var(--accent2);
    }

    .drop-main {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text);
    }

    .drop-sub {
      font-size: 11.5px;
      color: var(--muted);
      margin-top: 3px;
    }

    .drop-filename {
      font-size: 12px;
      font-weight: 500;
      color: var(--accent2);
      word-break: break-all;
      font-family: "DM Mono", monospace;
    }

    .columns-wrap {
      flex: 1;
      min-width: 200px;
    }

    .columns-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .mode-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .mode-select {
      appearance: none;
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 11px 14px;
      font-family: "DM Sans", sans-serif;
      font-size: 14px;
      min-width: 220px;
      outline: none;
    }

    .mode-help {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
      max-width: 500px;
    }

    .col-tag {
      display: inline-block;
      background: rgba(200,169,110,0.07);
      border: 1px solid rgba(200,169,110,0.18);
      color: var(--accent2);
      font-size: 11px;
      font-weight: 500;
      font-family: "DM Mono", monospace;
      letter-spacing: 0.03em;
      padding: 3px 10px;
      border-radius: 100px;
      transition: background 0.15s;
    }

    .col-tag:hover {
      background: rgba(200,169,110,0.15);
    }

    textarea {
      width: 100%;
      min-height: 230px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: #b8d4a0;
      font-family: "DM Mono", monospace;
      font-size: 13px;
      line-height: 1.75;
      padding: 18px 20px;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
      caret-color: var(--accent);
    }

    textarea:focus {
      border-color: rgba(200,169,110,0.4);
    }

    textarea::placeholder {
      color: #3d3b46;
    }

    .actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #c8a96e, #e8c98e);
      color: #1a1408;
      border: none;
      padding: 11px 26px;
      border-radius: 10px;
      font-family: "DM Sans", sans-serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: filter 0.18s, transform 0.15s;
    }

    .btn-primary:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-primary:active { transform: translateY(0); }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
      padding: 10px 20px;
      border-radius: 10px;
      font-family: "DM Sans", sans-serif;
      font-size: 14px;
      font-weight: 400;
      cursor: pointer;
      transition: color 0.18s, border-color 0.18s, background 0.18s;
    }

    .btn-ghost:hover {
      color: var(--text);
      border-color: rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.04);
    }

    .spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(26,20,8,0.3);
      border-top-color: #1a1408;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .status-wrap {
      padding: 0 28px 24px;
    }

    .status-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 12px;
      padding: 13px 18px;
      font-size: 13.5px;
      animation: slideIn 0.28s ease;
    }

    .status-bar.success {
      background: rgba(93,186,138,0.08);
      border: 1px solid rgba(93,186,138,0.22);
      color: var(--success);
    }

    .status-bar.error {
      background: rgba(224,112,112,0.08);
      border: 1px solid rgba(224,112,112,0.22);
      color: var(--error);
    }

    .status-icon {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .footnote {
      width: 100%;
      max-width: 720px;
      margin-top: 18px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      color: var(--dim);
      font-size: 13px;
      line-height: 1.65;
      padding: 0 4px;
    }

    .footnote-icon {
      color: rgba(200,169,110,0.3);
      font-size: 15px;
      margin-top: 1px;
      flex-shrink: 0;
    }

    #fileInput { display: none; }

    @media (max-width: 520px) {
      h1 { font-size: 26px; }
      .section { padding: 20px 18px; }
      .status-wrap { padding: 0 18px 18px; }
      .drop-zone { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div class="header-icon">IMP</div>
      <h1>Student Import Desk</h1>
    </div>
    <p class="header-sub">
      Upload a <code>.json</code> or <code>.csv</code> file, or paste the records directly.
      Import enrollments first, then upload prelim, midterm, or finals grades separately.
    </p>
  </div>

  <div class="card">
    <div class="section">
      <div class="label">Import Mode</div>
      <div class="mode-row">
        <select id="importMode" class="mode-select" onchange="updateImportMode()">
          <option value="full">Enrollment Only</option>
          <option value="prelim">Prelim Grades Only</option>
          <option value="midterm">Midterm Grades Only</option>
          <option value="finals">Finals Grades Only</option>
        </select>
        <div class="mode-help" id="modeHelp">
          Create or update students and class enrollments. Upload grades in a separate step.
        </div>
      </div>

      <div class="upload-row">
        <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
          <span class="drop-icon">+</span>
          <div class="drop-main" id="dropMain">Drop file here</div>
          <div class="drop-sub" id="dropSub">or click to browse</div>
        </div>
        <input type="file" id="fileInput" accept=".json,.csv" />

        <div class="columns-wrap">
          <div class="label">Expected Columns</div>
          <div class="columns-pills" id="expectedColumns"></div>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section">
      <div class="label" id="contentLabel">JSON Array or CSV Content</div>
      <textarea id="contentArea"></textarea>
    </div>

    <div class="divider"></div>

    <div class="section actions">
      <button class="btn-primary" id="importBtn" onclick="handleImport()">
        <span>+</span> Import Records
      </button>
      <button class="btn-ghost" onclick="loadSample()">Load Sample</button>
      <button class="btn-ghost" onclick="clearAll()">Clear</button>
    </div>

    <div id="statusWrap" style="display:none;" class="status-wrap">
      <div class="divider" style="margin-bottom:24px;"></div>
      <div class="status-bar" id="statusBar">
        <span class="status-icon" id="statusIcon"></span>
        <span id="statusMsg"></span>
      </div>
    </div>
  </div>

  <div class="footnote">
    <span class="footnote-icon">i</span>
    <span id="footnoteText">Re-importing the same student, class, and subject updates the existing grade record. Students and subjects are created automatically if they do not exist.</span>
  </div>

  <script>
    const IMPORT_MODES = {
      full: {
        label: "Enrollment Only",
        help: "Create or update students and class enrollments. Upload grades in a separate step.",
        columns: ["student_id", "first_name", "last_name", "email", "class_name", "section", "enrollment_date"],
        sample: [
          {
            student_id: 18016062,
            first_name: "Alice",
            last_name: "Example",
            email: "alice@example.com",
            class_name: "BSIT-1",
            section: "A",
            enrollment_date: "2026-03-11"
          }
        ],
        footnote: "Re-importing the same student and class updates the existing enrollment. Grades are uploaded separately after enrollments exist."
      },
      prelim: {
        label: "Prelim Grades Only",
        help: "Update only prelim grades. Each row is matched to the student's latest enrollment using student_id.",
        columns: ["student_id", "subject_name", "prelim"],
        sample: [
          {
            student_id: 18016062,
            subject_name: "Mathematics",
            prelim: 89
          }
        ],
        footnote: "Prelim upload updates only the prelim column for the latest enrollment found for each student_id."
      },
      midterm: {
        label: "Midterm Grades Only",
        help: "Update only midterm grades. Each row is matched to the student's latest enrollment using student_id.",
        columns: ["student_id", "subject_name", "midterm"],
        sample: [
          {
            student_id: 18016062,
            subject_name: "Mathematics",
            midterm: 91
          }
        ],
        footnote: "Midterm upload updates only the midterm column for the latest enrollment found for each student_id."
      },
      finals: {
        label: "Finals Grades Only",
        help: "Update only finals grades. Each row is matched to the student's latest enrollment using student_id.",
        columns: ["student_id", "subject_name", "finals"],
        sample: [
          {
            student_id: 18016062,
            subject_name: "Mathematics",
            finals: 93
          }
        ],
        footnote: "Finals upload updates only the finals column for the latest enrollment found for each student_id."
      }
    };

    document.getElementById("fileInput").addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      readFile(file);
    });

    const dropZone = document.getElementById("dropZone");

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragging");
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
      const file = event.dataTransfer.files[0];
      if (file) readFile(file);
    });

    function getImportMode() {
      return document.getElementById("importMode").value;
    }

    function updateImportMode() {
      const mode = IMPORT_MODES[getImportMode()];
      const columnsWrap = document.getElementById("expectedColumns");
      const contentArea = document.getElementById("contentArea");

      document.getElementById("modeHelp").textContent = mode.help;
      document.getElementById("contentLabel").textContent = mode.label + " Payload";
      document.getElementById("footnoteText").textContent = mode.footnote;

      columnsWrap.innerHTML = mode.columns
        .map((column) => '<span class="col-tag">' + column + "</span>")
        .join("");

      contentArea.placeholder = JSON.stringify(mode.sample, null, 2);
      hideStatus();
    }

    function readFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById("contentArea").value = event.target.result;
      };
      reader.readAsText(file);
      document.getElementById("dropMain").textContent = file.name;
      document.getElementById("dropMain").className = "drop-filename";
      document.getElementById("dropSub").style.display = "none";
    }

    async function handleImport() {
      const content = document.getElementById("contentArea").value.trim();
      const importMode = getImportMode();

      if (!content) {
        showStatus("error", "No content to import. Paste JSON/CSV or upload a file.");
        return;
      }

      const btn = document.getElementById("importBtn");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Importing...';

      try {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: content, importMode })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Import failed.");
        }

        showStatus(
          "success",
          "Successfully imported " + result.imported + " record" + (result.imported !== 1 ? "s." : ".")
        );
      } catch (error) {
        showStatus("error", error.message || "Import failed.");
      } finally {
        btn.disabled = false;
        btn.innerHTML = "<span>+</span> Import Records";
      }
    }

    function loadSample() {
      const mode = IMPORT_MODES[getImportMode()];
      document.getElementById("contentArea").value = JSON.stringify(mode.sample, null, 2);
      document.getElementById("dropMain").textContent = "Drop file here";
      document.getElementById("dropMain").className = "drop-main";
      document.getElementById("dropSub").style.display = "";
      hideStatus();
    }

    function clearAll() {
      document.getElementById("contentArea").value = "";
      document.getElementById("dropMain").textContent = "Drop file here";
      document.getElementById("dropMain").className = "drop-main";
      document.getElementById("dropSub").style.display = "";
      document.getElementById("fileInput").value = "";
      hideStatus();
    }

    function showStatus(type, msg) {
      const wrap = document.getElementById("statusWrap");
      const bar = document.getElementById("statusBar");
      const icon = document.getElementById("statusIcon");
      const text = document.getElementById("statusMsg");

      bar.className = "status-bar " + type;
      icon.textContent = type === "success" ? "OK" : "X";
      text.textContent = msg;
      wrap.style.display = "block";

      bar.style.animation = "none";
      bar.offsetHeight;
      bar.style.animation = "";
    }

    function hideStatus() {
      document.getElementById("statusWrap").style.display = "none";
    }

    updateImportMode();
  </script>
</body>
</html>`;
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

function parsePayload(payload) {
  try {
    const json = JSON.parse(payload);
    if (!Array.isArray(json)) {
      throw new Error("JSON payload must be an array of records.");
    }
    return json;
  } catch (jsonError) {
    const csv = parseCsv(payload);
    if (!csv.length) {
      throw new Error("Payload must be a JSON array or a CSV file with headers.");
    }
    return csv;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(renderPage());
    return;
  }

  if (request.method === "POST" && request.url === "/api/import") {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });

    request.on("end", async () => {
      try {
        const { payload, importMode = "full" } = JSON.parse(rawBody || "{}");
        const records = parsePayload(String(payload || ""));

        if (!records.length) {
          throw new Error("No records found in the uploaded data.");
        }

        await ensureSchema();
        const result =
          importMode === "full"
            ? await importStudentRecords(records)
            : await importGradeRecords(records, importMode);
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
    });

    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`Admin import page running at http://${host}:${port}`);
});

process.on("SIGINT", async () => {
  await close();
  process.exit(0);
});
