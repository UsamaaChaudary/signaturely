"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Download, Bell, X, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { getCompletedFileUrl } from "@/lib/api";
import { toast } from "sonner";

interface Signer { status: string; signingToken?: string; }
interface Request {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  completedFilePath?: string;
  documentId?: { originalName: string };
  signers?: Signer[];
}

interface Props {
  request: Request;
  compact?: boolean;
  onRemind?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export default function RequestRow({ request, compact = false, onRemind, onCancel }: Props) {
  const router = useRouter();
  const signed = request.signers?.filter((s) => s.status === "completed").length ?? 0;
  const total  = request.signers?.length ?? 0;

  const pendingSigners = request.signers?.filter(
    (s) => s.status !== "completed" && s.status !== "declined" && s.signingToken
  ) ?? [];

  const copySigningLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pendingSigners.length === 0) return;
    const token = pendingSigners[0].signingToken!;
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Signing link copied", { description: "Share this link with the signer" });
    });
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${compact ? "text-sm" : ""}`}
      onClick={() => router.push(`/requests/${request._id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{request.title}</p>
        {!compact && request.documentId && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{request.documentId.originalName}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(request.createdAt).toLocaleDateString()} · {signed}/{total} signed
        </p>
      </div>
      <StatusBadge status={request.status} />
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link href={`/requests/${request._id}`}>
          <Button variant="ghost" size="icon-sm" title="View details">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
        {request.status === "completed" && request.completedFilePath && (
          <>
            <a href={getCompletedFileUrl(request.completedFilePath)} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm" title="View signed PDF">
                <ExternalLink className="h-4 w-4 text-indigo-500" />
              </Button>
            </a>
            <a href={getCompletedFileUrl(request.completedFilePath)} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm" title="Download">
                <Download className="h-4 w-4 text-green-600" />
              </Button>
            </a>
          </>
        )}
        {(request.status === "pending" || request.status === "in_progress") && (
          <>
            {pendingSigners.length > 0 && (
              <Button variant="ghost" size="icon-sm" title="Copy signing link" onClick={copySigningLink}>
                <Link2 className="h-4 w-4 text-indigo-500" />
              </Button>
            )}
            {onRemind && (
              <Button variant="ghost" size="icon-sm" title="Remind" onClick={() => onRemind(request._id)}>
                <Bell className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            {onCancel && (
              <Button variant="ghost" size="icon-sm" title="Cancel" onClick={() => onCancel(request._id)}>
                <X className="h-4 w-4 text-red-400" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
