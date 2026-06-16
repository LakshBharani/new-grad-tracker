type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-3xl",
};

const BRAND = "#0a66c2";

export function Logo({ size = "md", className }: { size?: Size; className?: string }) {
  return (
    <span className={`inline-flex items-center font-bold tracking-tight text-gray-900 ${SIZES[size]} ${className ?? ""}`}>
      locked<span style={{ color: BRAND }}>.in</span>
    </span>
  );
}


