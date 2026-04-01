import { google } from "googleapis";
import fs from "fs";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheets() {
  if (sheetsClient) return sheetsClient;

  let key;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Vercel: inline JSON from env var
    key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else {
    // Local: file path
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!;
    key = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  }

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEET_NAME = process.env.QUICK_LOG_SHEET!;

export async function appendExpense(row: {
  date: string;
  time: string;
  who: string;
  amount: number;
  description: string;
  category: string;
}) {
  const sheets = getSheets();
  const month = new Date().toLocaleString("en-US", { month: "long" });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[row.date, row.time, row.who, row.amount, row.description, row.category, month]],
    },
  });
}

export async function getEntries(limit = 50): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:G`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  return rows.slice(-limit).reverse();
}

export async function getSummary(): Promise<{
  today: number;
  week: number;
  month: number;
  byCategory: Record<string, number>;
  byCategoryMonth: Record<string, number>;
  byPerson: Record<string, number>;
  budgets: Record<string, number>;
}> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:G`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const todayYear = now.getFullYear();
  const startOfWeek = new Date(todayYear, todayMonth, todayDate - now.getDay());

  let today = 0;
  let week = 0;
  let month = 0;
  const byCategory: Record<string, number> = {};
  const byCategoryMonth: Record<string, number> = {};
  const byPerson: Record<string, number> = {};

  for (const row of rows) {
    const dateStr = String(row[0]);
    const rawAmount = String(row[3] || "0").replace(/[$,]/g, "");
    const amount = Math.abs(parseFloat(rawAmount) || 0);
    const category = row[5] || "Uncategorized";
    const who = row[2] || "Unknown";

    const parts = dateStr.split("/");
    if (parts.length < 3) continue;
    const m = parseInt(parts[0], 10) - 1;
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const entryDate = new Date(y, m, d, 12, 0, 0);

    if (m === todayMonth && d === todayDate && y === todayYear) today += amount;
    if (entryDate >= startOfWeek) week += amount;
    if (m === todayMonth && y === todayYear) {
      month += amount;
      byCategoryMonth[category] = (byCategoryMonth[category] || 0) + amount;
    }

    byCategory[category] = (byCategory[category] || 0) + amount;
    byPerson[who] = (byPerson[who] || 0) + amount;
  }

  // Pull budget targets from Budget sheet (rows 4-23, col A = category, col C = budget)
  const budgetRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Budget'!A4:C23",
    valueRenderOption: "FORMATTED_VALUE",
  });

  const budgetRows = budgetRes.data.values || [];
  const budgets: Record<string, number> = {};
  for (const bRow of budgetRows) {
    const cat = bRow[0];
    const rawBudget = String(bRow[2] || "0").replace(/[$,]/g, "");
    const budgetAmt = parseFloat(rawBudget) || 0;
    if (cat && budgetAmt > 0) {
      budgets[cat] = budgetAmt;
    }
  }

  return { today, week, month, byCategory, byCategoryMonth, byPerson, budgets };
}
