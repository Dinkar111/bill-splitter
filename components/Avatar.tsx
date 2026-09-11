import { hueOf, initials } from "@/lib/format";

export function Avatar({ id, name, size = "md" }: { id: string; name: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "av sm" : size === "lg" ? "av lg" : "av";
  return (
    <span className={cls} style={{ background: `hsl(${hueOf(id)} 45% 45%)` }}>
      {initials(name)}
    </span>
  );
}
