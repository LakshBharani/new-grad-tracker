import { STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  INTERESTED: "bg-amber-100 text-amber-700",
  APPLIED: "bg-blue-100 text-blue-700",
  OA: "bg-amber-100 text-amber-700",
  PHONE_SCREEN: "bg-purple-100 text-purple-700",
  INTERVIEW: "bg-cyan-100 text-cyan-700",
  OFFER: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status;
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-700";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", style)}>
      {label}
    </span>
  );
}
