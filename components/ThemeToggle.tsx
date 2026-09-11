"use client";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme");
    const dark = cur ? cur === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("splittab-theme", next);
    } catch {}
  }
  return (
    <button className="btn sm" style={{ borderRadius: 999, width: 34, height: 34, padding: 0 }} onClick={toggle} aria-label="Toggle theme">
      ◑
    </button>
  );
}
