const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

/* Toast */
const toast = (msg) => {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
};

/* Year */
$("#year").textContent = new Date().getFullYear();

/* Mobile menu */
const hamburger = $("#hamburger");
const mobileMenu = $("#mobileMenu");
hamburger.addEventListener("click", () => {
  mobileMenu.style.display = (mobileMenu.style.display === "block") ? "none" : "block";
});

/* Close mobile menu on link click */
$$('.mobile a[href^="#"]').forEach(a => {
  a.addEventListener("click", () => { mobileMenu.style.display = "none"; });
});

/* Copy quote */
const QUOTE = "Every regulation creates its own escape velocity.";
async function copyText(text, okMsg="Copied.") {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { toast("Clipboard blocked — copy manually."); }
}
$("#copyQuoteBtn").addEventListener("click", () => copyText(QUOTE, "Copied quote."));
$("#copyQuoteBtnMobile").addEventListener("click", () => copyText(QUOTE, "Copied quote."));

/* Interpreter state */
const input = $("#inputText");
const output = $("#outputBox");
const charCount = $("#charCount");

let activeMode = "neutral";

/* Mode buttons */
$$(".mode").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeMode = btn.dataset.mode;
  });
});

/* Character count */
function updateCount() {
  const n = (input.value || "").length;
  charCount.textContent = `${n.toLocaleString()} chars`;
}
input.addEventListener("input", updateCount);
updateCount();

/* Helpers */
function cleanText(t){
  return (t || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(t){
  // Reasonable heuristic for policy/regulatory text
  return t
    .replace(/\n+/g, " ")
    .split(/(?<=[.?!])\s+(?=[A-Z“"(\[])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function extractBullets(text){
  const lines = (text || "").split("\n").map(l => l.trim());
  const bullets = lines
    .filter(l => /^[-•*]\s+/.test(l) || /^\d+\.\s+/.test(l))
    .slice(0, 10)
    .map(l => l.replace(/^([-•*]|\d+\.)\s+/, ""));
  return bullets;
}

function topSentences(text, n=3){
  const sents = splitSentences(text);
  if (sents.length <= n) return sents;

  const keywords = [
    "must","should","shall","required","requirement","prohibited","ban","cannot",
    "report","reporting","disclose","disclosure","record","records","retain","retention",
    "customer","client","user","exchange","platform","provider","issuer",
    "tax","hmrc","uk","fca","regulation","rules","compliance","guidance",
    "threshold","deadline","penalty","fine","sanction","scope","definition",
    "identity","verification","aml","kyc"
  ];

  const scored = sents.map((s, i) => {
    const lower = s.toLowerCase();
    let score = 0;
    keywords.forEach(k => { if (lower.includes(k)) score += 2; });
    score += Math.min(s.length, 220) / 60;              // prefer informative length
    score += Math.max(0, 2 - i * 0.08);                 // slight early bias
    return { s, score, i };
  });

  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, n).sort((a,b) => a.i - b.i).map(x => x.s);
}

function findAmbiguities(text){
  const sents = splitSentences(text);
  const triggers = [
    "may","might","could","reasonable","generally","typically",
    "where appropriate","subject to","at the discretion",
    "material","significant","adequate","as soon as practicable",
    "to the extent","as determined"
  ];
  return sents.filter(s => triggers.some(t => s.toLowerCase().includes(t))).slice(0, 6);
}

function commonNotSaid(){
  return [
    "It does not guarantee how enforcement will treat every edge case.",
    "It does not confirm your specific action is compliant — that requires professional advice.",
    "It may not state thresholds, dates, or definitions unless explicitly included in the text.",
  ];
}

function formatList(items){
  return items.map(x => `• ${x}`).join("\n");
}

function buildOutput(mode, raw){
  const t = cleanText(raw);
  if (!t) return "Paste regulation text or a question, then click Generate.";

  const bullets = extractBullets(t);
  const key = topSentences(t, mode === "simple" ? 2 : 3);
  const unclear = findAmbiguities(t);
  const notSays = commonNotSaid();

  if (mode === "simple") {
    return [
      "SIMPLE EXPLANATION (informational)",
      "",
      "Key points:",
      formatList(key),
      "",
      "What to watch:",
      formatList(notSays.slice(0,2)),
      "",
      "Reminder: informational only — not legal/tax/financial advice."
    ].join("\n");
  }

  if (mode === "trader") {
    return [
      "TRADER VIEW (informational)",
      "",
      "What changes (high level):",
      formatList(key),
      "",
      "Likely practical impacts (non-advice):",
      formatList([
        "More reporting / record-keeping burden for platforms and service providers.",
        "Greater focus on definitions (scope) and customer classification.",
        "Documentation and audit trails become more important during reviews."
      ]),
      "",
      "What remains unclear:",
      formatList(unclear.length ? unclear : ["Ambiguity depends on missing definitions, guidance updates, and enforcement practice."]),
      "",
      "Reminder: informational only."
    ].join("\n");
  }

  if (mode === "risks") {
    return [
      "RISK FRAMING (informational, non-advice)",
      "",
      "Compliance risk:",
      formatList([
        "Misreading scope/definitions; failing stated reporting or record obligations.",
        "Weak documentation: inability to evidence compliance decisions."
      ]),
      "",
      "Operational risk:",
      formatList([
        "Data retention, customer data collection, audit logging, vendor dependencies.",
        "Process changes: onboarding controls and internal review workflows."
      ]),
      "",
      "Enforcement / interpretation risk:",
      formatList([
        "Different interpretations across firms until further guidance emerges.",
        "Rules can tighten through clarifications, casework, or supervisory focus."
      ]),
      "",
      "Signals from the text you pasted:",
      formatList(key),
      "",
      "Ambiguity triggers detected:",
      formatList(unclear.length ? unclear : ["No obvious ambiguity triggers detected in the pasted text."]),
      "",
      "Reminder: informational only."
    ].join("\n");
  }

  // neutral default
  const sections = [];
  sections.push("NEUTRAL INTERPRETATION (informational)");
  sections.push("");
  sections.push("What it says (high level):");
  sections.push(formatList(key));
  sections.push("");

  if (bullets.length) {
    sections.push("Key obligations (from bullets / enumerations):");
    sections.push(formatList(bullets));
    sections.push("");
  }

  sections.push("What it does NOT say (common misread):");
  sections.push(formatList(notSays));
  sections.push("");

  sections.push("Unclear / needs context:");
  sections.push(formatList(unclear.length ? unclear : ["Depends on missing definitions, updates to guidance, and enforcement practice."]));
  sections.push("");

  sections.push("Watchpoints (non-advice):");
  sections.push(formatList([
    "Confirm scope definitions and which entities/activities are captured.",
    "Track reporting/record retention obligations, timing, and data requirements.",
    "Note any 'may/subject to' language — interpretation can differ."
  ]));
  sections.push("");
  sections.push("Reminder: informational only — not legal/tax/financial advice.");

  return sections.join("\n");
}

/* Output rendering */
function setOutputText(text){
  output.textContent = text;
}

/* Buttons */
$("#generateBtn").addEventListener("click", () => {
  setOutputText(buildOutput(activeMode, input.value));
  toast("Generated output.");
});

$("#clearBtn").addEventListener("click", () => {
  input.value = "";
  updateCount();
  output.innerHTML = `
    <div class="empty">
      <div class="spark"></div>
      <div>
        <div class="empty-title">Ready.</div>
        <div class="empty-sub">Paste text on the left and click <b>Generate</b>.</div>
      </div>
    </div>
  `;
  toast("Cleared.");
});

$("#exampleBtn").addEventListener("click", () => {
  input.value =
`Example (informational):
Platforms may be required to collect and report customer information and transaction data. Obligations may depend on whether activities fall within scope definitions, applicable thresholds, and reporting timelines. Some requirements are subject to further guidance and may vary based on implementation details and supervisory focus.

Questions:
1) What does this require (high level)?
2) What is unclear and likely to be interpreted differently?
3) What do people commonly misread?`;
  updateCount();
  toast("Example loaded.");
});

/* Copy output */
$("#copyOutputBtn").addEventListener("click", () => {
  const txt = (output.textContent || "").trim();
  if (!txt) return toast("Nothing to copy.");
  copyText(txt, "Copied output.");
});

/* Download output */
$("#downloadBtn").addEventListener("click", () => {
  const txt = (output.textContent || "").trim();
  if (!txt) return toast("Nothing to download.");

  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "loop-hole-finance-output.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Downloaded .txt");
});
