const requestColors: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed:   "bg-green-100 text-green-800",
  cancelled:   "bg-gray-100 text-gray-600",
  declined:    "bg-red-100 text-red-800",
};

const signerColors: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800",
  viewed:    "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  declined:  "bg-red-100 text-red-800",
};

const labels: Record<string, string> = {
  pending:     "Pending",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  declined:    "Declined",
  viewed:      "Viewed",
};

interface Props {
  status: string;
  variant?: "request" | "signer";
  className?: string;
}

export default function StatusBadge({ status, variant = "request", className = "" }: Props) {
  const colorMap = variant === "signer" ? signerColors : requestColors;
  const color = colorMap[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${color} ${className}`}>
      {labels[status] ?? status}
    </span>
  );
}
