const SYMBOLS: Record<string, string> = { NPR: "Rs", INR: "₹", USD: "$", EUR: "€", GBP: "£", AUD: "A$", JPY: "¥" };

export function currencySymbol(code: string) {
  return SYMBOLS[code] || code + " ";
}

const groupDigits = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Formats integer minor units (paisa) as a major-unit string, e.g. 492000 -> "4,920". */
export function money(minor: number): string {
  const neg = minor < 0;
  const v = Math.abs(Math.round(minor));
  const rupees = Math.floor(v / 100);
  const p = v % 100;
  let out = groupDigits(String(rupees));
  if (p) out += "." + String(p).padStart(2, "0");
  return (neg ? "-" : "") + out;
}

export function initials(name: string) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function hueOf(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function prettyDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function memberName(members: { id: string; display_name: string }[], id: string) {
  return members.find((m) => m.id === id)?.display_name || "(removed)";
}

export function emojiFor(text: string) {
  const t = (text || "").toLowerCase();
  if (/coffee|cafe|tea/.test(t)) return "☕";
  if (/lunch|dinner|breakfast|food|restaurant|eat|meal/.test(t)) return "🍽️";
  if (/pizza/.test(t)) return "🍕";
  if (/beer|bar|drink|pub/.test(t)) return "🍺";
  if (/basket|foot|sport|game|court/.test(t)) return "🏀";
  if (/grocer|mart|store|shop/.test(t)) return "🛒";
  if (/trip|hotel|stay|travel/.test(t)) return "🧳";
  if (/movie|cinema/.test(t)) return "🎬";
  return "🧾";
}
