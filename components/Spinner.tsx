export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, size / 8)}px solid currentColor`,
        borderTopColor: "transparent",
        opacity: 0.85,
        animation: "spin .7s linear infinite",
      }}
    />
  );
}

export function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0", color: "var(--ink-soft)" }}>
      <Spinner size={28} />
    </div>
  );
}
