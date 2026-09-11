"use client";

import { useEffect, useState } from "react";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeSegmented() {
  const [current, setCurrent] = useState("");

  useEffect(() => {
    // One-time read of the theme applied by ThemeScript before hydration —
    // there's no React-owned source of truth for it to derive from instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(document.documentElement.getAttribute("data-theme") || "");
  }, []);

  function apply(value: string) {
    if (value) document.documentElement.setAttribute("data-theme", value);
    else document.documentElement.removeAttribute("data-theme");
    try {
      if (value) localStorage.setItem("splittab-theme", value);
      else localStorage.removeItem("splittab-theme");
    } catch {}
    setCurrent(value);
  }

  return (
    <div className="seg">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" className={current === o.value ? "on" : ""} onClick={() => apply(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
