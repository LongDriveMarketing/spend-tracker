"use client";

import { useState, useEffect, useCallback } from "react";
import { SPENDING_CATEGORIES } from "@/lib/categories";

type Tab = "log" | "history" | "stats";

interface Entry {
  date: string;
  time: string;
  who: string;
  amount: string;
  description: string;
  category: string;
}

interface Summary {
  today: number;
  week: number;
  month: number;
  byCategoryMonth: Record<string, number>;
  byPerson: Record<string, number>;
  budgets: Record<string, number>;
}

export default function Home() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [storedPin, setStoredPin] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("spend-pin");
    if (saved) {
      setStoredPin(saved);
      setAuthed(true);
    }
  }, []);

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 4) return;
      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: next }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.ok) {
              localStorage.setItem("spend-pin", next);
              setStoredPin(next);
              setAuthed(true);
            } else {
              setPinError(true);
              setTimeout(() => {
                setPin("");
                setPinError(false);
              }, 500);
            }
          });
      }
    },
    [pin]
  );

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  if (!authed) {
    return <PinScreen pin={pin} error={pinError} onDigit={handlePinDigit} onDelete={handlePinDelete} />;
  }

  return <MainApp pin={storedPin} />;
}

function PinScreen({
  pin,
  error,
  onDigit,
  onDelete,
}: {
  pin: string;
  error: boolean;
  onDigit: (d: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6">
      <div className="text-sm font-medium tracking-wide mb-8" style={{ color: "var(--text-dim)" }}>
        SPEND TRACKER
      </div>

      <div className={`flex gap-4 mb-10 ${error ? "shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
          if (key === "") return <div key="empty" />;
          if (key === "del") {
            return (
              <button key="del" className="pin-key" onClick={onDelete}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            );
          }
          return (
            <button key={key} className="pin-key" onClick={() => onDigit(key)}>
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MainApp({ pin }: { pin: string }) {
  const [tab, setTab] = useState<Tab>("log");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [who, setWho] = useState("James");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadEntries = useCallback(() => {
    setLoadingEntries(true);
    fetch("/api/entries", { headers: { "x-pin": pin } })
      .then((r) => r.json())
      .then((data) => {
        const parsed = (data.entries || []).map((row: string[]) => ({
          date: row[0],
          time: row[1],
          who: row[2],
          amount: row[3],
          description: row[4],
          category: row[5],
        }));
        setEntries(parsed);
      })
      .finally(() => setLoadingEntries(false));
  }, [pin]);

  const loadSummary = useCallback(() => {
    setLoadingSummary(true);
    fetch("/api/summary", { headers: { "x-pin": pin } })
      .then((r) => r.json())
      .then((data) => setSummary(data))
      .finally(() => setLoadingSummary(false));
  }, [pin]);

  useEffect(() => {
    if (tab === "history") loadEntries();
    if (tab === "stats") {
      loadSummary();
      loadEntries();
    }
  }, [tab, loadEntries, loadSummary]);

  const handleSubmit = async () => {
    if (!amount || !description || !category) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "x-pin": pin, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description, category, who }),
      });
      if (res.ok) {
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
        setAmount("");
        setDescription("");
        setCategory("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAmountKey = (key: string) => {
    if (key === "del") {
      setAmount((a) => a.slice(0, -1));
      return;
    }
    if (key === "." && amount.includes(".")) return;
    const parts = amount.split(".");
    if (parts[1] && parts[1].length >= 2) return;
    setAmount((a) => a + key);
  };

  return (
    <div className={`min-h-dvh pb-20 ${flash ? "flash-success" : ""}`}>
      <div className="px-5 pt-[env(safe-area-inset-top)] sticky top-0 z-40" style={{ background: "var(--bg)" }}>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--green)" }}>
            SPEND TRACKER
          </span>
          <button
            className="text-xs"
            style={{ color: "var(--text-dim)" }}
            onClick={() => {
              localStorage.removeItem("spend-pin");
              window.location.reload();
            }}
          >
            Lock
          </button>
        </div>
      </div>

      <div className="px-5">
        {tab === "log" && (
          <LogTab
            amount={amount}
            description={description}
            category={category}
            who={who}
            submitting={submitting}
            onAmountKey={handleAmountKey}
            onAmountRaw={setAmount}
            onDescriptionChange={setDescription}
            onCategoryChange={setCategory}
            onWhoChange={setWho}
            onSubmit={handleSubmit}
          />
        )}
        {tab === "history" && <HistoryTab entries={entries} loading={loadingEntries} onRefresh={loadEntries} />}
        {tab === "stats" && <StatsTab summary={summary} entries={entries} loading={loadingSummary} onRefresh={() => { loadSummary(); loadEntries(); }} />}
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Log
        </button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          History
        </button>
        <button className={`tab-btn ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="12" width="4" height="9" rx="1" />
            <rect x="10" y="7" width="4" height="14" rx="1" />
            <rect x="17" y="3" width="4" height="18" rx="1" />
          </svg>
          Stats
        </button>
      </div>
    </div>
  );
}

function LogTab({
  amount,
  description,
  category,
  who,
  submitting,
  onAmountKey,
  onAmountRaw,
  onDescriptionChange,
  onCategoryChange,
  onWhoChange,
  onSubmit,
}: {
  amount: string;
  description: string;
  category: string;
  who: string;
  submitting: boolean;
  onAmountKey: (key: string) => void;
  onAmountRaw: (val: string) => void;
  onDescriptionChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onWhoChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = amount && description && category && !submitting;

  return (
    <div className="flex flex-col gap-5">
      <div className="person-toggle">
        <button className={`person-btn ${who === "James" ? "active" : ""}`} onClick={() => onWhoChange("James")}>
          James
        </button>
        <button className={`person-btn ${who === "Lana" ? "active" : ""}`} onClick={() => onWhoChange("Lana")}>
          Lana
        </button>
      </div>

      {/* Tappable amount — tap to use keyboard instead of numpad */}
      <div className="text-center py-2">
        <div className="amount-display relative">
          <span className="dollar">$</span>
          <span>{amount || "0"}</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*\.?\d{0,2}$/.test(val)) onAmountRaw(val);
            }}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            style={{ fontSize: "48px" }}
          />
        </div>
      </div>

      {/* Full-width number pad */}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((key) => (
          <button
            key={key}
            className="h-20 rounded-xl flex items-center justify-center text-3xl font-semibold active:scale-95 transition-transform"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            onClick={() => onAmountKey(key)}
          >
            {key === "del" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="What did you buy?"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl outline-none"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
      />

      <div>
        <div className="text-xs font-medium mb-2" style={{ color: "var(--text-dim)" }}>
          CATEGORY
        </div>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl outline-none appearance-none"
          style={{
            background: "var(--card)",
            border: `1px solid ${category ? "var(--green)" : "var(--border)"}`,
            color: category ? "var(--text)" : "var(--text-dim)",
          }}
        >
          <option value="" disabled>Select a category...</option>
          {SPENDING_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full py-4 rounded-xl text-base font-bold transition-all"
        style={{
          background: canSubmit ? "var(--green)" : "var(--border)",
          color: canSubmit ? "#000" : "var(--text-dim)",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Logging..." : "Log Expense"}
      </button>
    </div>
  );
}

function HistoryTab({ entries, loading, onRefresh }: { entries: Entry[]; loading: boolean; onRefresh: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent</h2>
        <button className="text-sm" style={{ color: "var(--green)" }} onClick={onRefresh}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      {entries.length === 0 && !loading && (
        <div className="text-center py-10" style={{ color: "var(--text-dim)" }}>
          No expenses logged yet
        </div>
      )}
      {entries.map((e, i) => (
        <div key={i} className="entry-row">
          <div>
            <div className="font-medium text-sm">{e.description}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              {e.category} &middot; {e.who} &middot; {e.date} {e.time}
            </div>
          </div>
          <div className="font-bold text-base" style={{ color: "var(--red)" }}>
            ${parseFloat(String(e.amount || "0").replace(/[$,]/g, "")).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsTab({ summary, entries, loading, onRefresh }: { summary: Summary | null; entries: Entry[]; loading: boolean; onRefresh: () => void }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const fmt = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmtShort = (n: number) => {
    if (n >= 1000) return "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return "$" + Math.round(n);
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const pctThrough = dayOfMonth / daysInMonth;

  // Filter entries to current month only
  const monthEntries = entries.filter((e) => {
    const parts = e.date?.split("/");
    if (!parts || parts.length < 3) return false;
    const m = parseInt(parts[0], 10) - 1;
    const y = parseInt(parts[2], 10);
    return m === now.getMonth() && y === now.getFullYear();
  });

  const getEntriesForCategory = (cat: string) =>
    monthEntries.filter((e) => e.category === cat);

  const getEntriesForPerson = (person: string) =>
    monthEntries.filter((e) => e.who === person);

  const sortedCats = summary
    ? Object.entries(summary.byCategoryMonth)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  // Budget categories — only show categories that have a budget > 0 OR spending this month
  // To hide a category from Stats, just set its budget to 0 (or blank) in the Budget sheet
  const budgetCats: { cat: string; spent: number; budget: number }[] = [];
  if (summary) {
    const seen = new Set<string>();
    // Categories with budgets set (skip $0 budgets — those are "turned off")
    for (const [cat, budget] of Object.entries(summary.budgets)) {
      if (budget > 0) {
        budgetCats.push({ cat, spent: summary.byCategoryMonth[cat] || 0, budget });
        seen.add(cat);
      }
    }
    // Categories with spending this month but no budget (still show so nothing hides)
    for (const [cat, spent] of Object.entries(summary.byCategoryMonth)) {
      if (!seen.has(cat)) {
        budgetCats.push({ cat, spent, budget: 0 });
      }
    }
    // Sort: over-budget first, then by spent descending
    budgetCats.sort((a, b) => b.spent - a.spent);
  }

  const totalBudget = budgetCats.reduce((s, r) => s + r.budget, 0);
  const totalSpent = budgetCats.reduce((s, r) => s + r.spent, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          {now.toLocaleString("en-US", { month: "long" })} Spending
        </h2>
        <button className="text-sm" style={{ color: "var(--green)" }} onClick={onRefresh}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {!summary && loading && (
        <div className="text-center py-10" style={{ color: "var(--text-dim)" }}>Loading...</div>
      )}

      {summary && (
        <>
          {/* Top stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="stat-card">
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>Today</div>
              <div className="text-lg font-bold">{fmt(summary.today)}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>This Week</div>
              <div className="text-lg font-bold">{fmt(summary.week)}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>This Month</div>
              <div className="text-lg font-bold">{fmt(summary.month)}</div>
            </div>
          </div>

          {/* Budget overview card */}
          {totalBudget > 0 && (
            <div className="stat-card mb-6">
              <div className="flex justify-between items-baseline mb-2">
                <div className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>MONTHLY BUDGET</div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                  Day {dayOfMonth} of {daysInMonth} ({Math.round(pctThrough * 100)}% through)
                </div>
              </div>
              <div className="flex justify-between items-baseline mb-3">
                <div className="text-2xl font-bold">{fmtShort(totalSpent)}</div>
                <div className="text-sm" style={{ color: "var(--text-dim)" }}>of {fmtShort(totalBudget)}</div>
              </div>
              <div className="h-3 rounded-full relative" style={{ background: "var(--border)" }}>
                {/* Pace marker — where you SHOULD be */}
                <div
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{
                    background: "var(--text-dim)",
                    left: `${pctThrough * 100}%`,
                    opacity: 0.5,
                    zIndex: 2,
                  }}
                />
                {/* Actual spend bar */}
                <div
                  className="h-3 rounded-full"
                  style={{
                    background: totalSpent > totalBudget ? "var(--red)" : totalSpent > totalBudget * pctThrough ? "#f59e0b" : "var(--green)",
                    width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2" style={{ color: "var(--text-dim)" }}>
                <span>
                  {totalSpent <= totalBudget * pctThrough
                    ? `${fmtShort(totalBudget * pctThrough - totalSpent)} under pace`
                    : totalSpent <= totalBudget
                    ? `${fmtShort(totalSpent - totalBudget * pctThrough)} ahead of pace`
                    : `${fmtShort(totalSpent - totalBudget)} over budget`}
                </span>
                <span>{fmtShort(totalBudget - totalSpent)} remaining</span>
              </div>
            </div>
          )}

          {/* By person */}
          {Object.keys(summary.byPerson).length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-medium mb-3" style={{ color: "var(--text-dim)" }}>BY PERSON</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(summary.byPerson).map(([person, total]) => (
                  <div key={person}>
                    <div
                      className="stat-card cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => setExpandedPerson(expandedPerson === person ? null : person)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>{person}</div>
                          <div className="text-lg font-bold">{fmt(total)}</div>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          style={{ color: "var(--text-dim)", transform: expandedPerson === person ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                    {expandedPerson === person && (
                      <div className="mt-2 flex flex-col gap-1">
                        {getEntriesForPerson(person).length === 0 ? (
                          <div className="text-xs px-3 py-2" style={{ color: "var(--text-dim)" }}>No entries this month</div>
                        ) : (
                          getEntriesForPerson(person).map((e, i) => (
                            <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg" style={{ background: "var(--card)" }}>
                              <div>
                                <div className="text-xs font-medium">{e.description}</div>
                                <div className="text-xs" style={{ color: "var(--text-dim)" }}>{e.category} &middot; {e.date}</div>
                              </div>
                              <div className="text-xs font-bold" style={{ color: "var(--red)" }}>
                                ${parseFloat(String(e.amount || "0").replace(/[$,]/g, "")).toFixed(2)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget vs Actual by category */}
          {budgetCats.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-3" style={{ color: "var(--text-dim)" }}>
                BUDGET vs ACTUAL
              </div>
              <div className="flex flex-col gap-4">
                {budgetCats.map(({ cat, spent, budget }) => {
                  const pct = budget > 0 ? spent / budget : 0;
                  const overBudget = budget > 0 && spent > budget;
                  const aheadOfPace = budget > 0 && spent > budget * pctThrough;
                  const barColor = overBudget ? "var(--red)" : aheadOfPace ? "#f59e0b" : "var(--green)";
                  const isExpanded = expandedCat === cat;
                  const catEntries = getEntriesForCategory(cat);

                  return (
                    <div key={cat}>
                      <div
                        className="cursor-pointer active:opacity-80 transition-opacity"
                        onClick={() => setExpandedCat(isExpanded ? null : cat)}
                      >
                        <div className="flex justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            {cat}
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              style={{ color: "var(--text-dim)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                          <span className="font-medium">
                            {fmt(spent)}
                            {budget > 0 && (
                              <span style={{ color: "var(--text-dim)" }}> / {fmtShort(budget)}</span>
                            )}
                          </span>
                        </div>
                        {budget > 0 ? (
                          <div className="h-2 rounded-full relative" style={{ background: "var(--border)" }}>
                            <div
                              className="absolute top-0 bottom-0 w-0.5"
                              style={{ background: "var(--text-dim)", left: `${pctThrough * 100}%`, opacity: 0.4 }}
                            />
                            <div
                              className="h-2 rounded-full"
                              style={{
                                background: barColor,
                                width: `${Math.min(pct * 100, 100)}%`,
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-2 rounded-full" style={{ background: "var(--border)" }}>
                            <div className="h-2 rounded-full" style={{ background: "var(--text-dim)", width: "100%", opacity: 0.3 }} />
                          </div>
                        )}
                        {budget > 0 && (
                          <div className="text-xs mt-1" style={{ color: overBudget ? "var(--red)" : aheadOfPace ? "#f59e0b" : "var(--green)" }}>
                            {overBudget
                              ? `${fmtShort(spent - budget)} over budget`
                              : `${fmtShort(budget - spent)} left`}
                          </div>
                        )}
                        {budget === 0 && (
                          <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>No budget set</div>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-2 ml-2 flex flex-col gap-1 border-l-2 pl-3" style={{ borderColor: "var(--border)" }}>
                          {catEntries.length === 0 ? (
                            <div className="text-xs py-2" style={{ color: "var(--text-dim)" }}>No entries this month</div>
                          ) : (
                            catEntries.map((e, i) => (
                              <div key={i} className="flex justify-between items-center py-2">
                                <div>
                                  <div className="text-xs font-medium">{e.description}</div>
                                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>{e.who} &middot; {e.date}</div>
                                </div>
                                <div className="text-xs font-bold" style={{ color: "var(--red)" }}>
                                  ${parseFloat(String(e.amount || "0").replace(/[$,]/g, "")).toFixed(2)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories with spending but no budget — simple list */}
          {sortedCats.length > 0 && budgetCats.length === 0 && (
            <div>
              <div className="text-xs font-medium mb-3" style={{ color: "var(--text-dim)" }}>
                BY CATEGORY (THIS MONTH)
              </div>
              <div className="flex flex-col gap-3">
                {sortedCats.map(([cat, total]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{cat}</span>
                      <span className="font-medium">{fmt(total)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--border)" }}>
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background: "var(--green)",
                          width: `${(total / (sortedCats[0]?.[1] || 1)) * 100}%`,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
