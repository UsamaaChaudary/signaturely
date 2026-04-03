"use client";
import Link from "next/link";
import { Eye, Download, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { getCompletedFileUrl } from "@/lib/api";

interface Signer { status: string; }
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
  const signed = request.signers?.filter((s) => s.status === "completed").length ?? 0;
  const total  = request.signers?.length ?? 0;

  return (
    <div className={`flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg ${compact ? "text-sm" : ""}`}>
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
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link href={`/requests/${request._id}`}>
          <Button variant="ghost" size="icon-sm" title="View">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
        {request.status === "completed" && request.completedFilePath && (
          <a href={getCompletedFileUrl(request.completedFilePath)} download target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon-sm" title="Download">
              <Download className="h-4 w-4 text-green-600" />
            </Button>
          </a>
        )}
        {(request.status === "pending" || request.status === "in_progress") && (
          <>
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
