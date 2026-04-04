"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { api, getCompletedFileUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statusIcons: Record<string, any> = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
};

interface Signer {
  status: string;
}

interface Request {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  completedFilePath?: string;
  documentId?: { originalName: string };
  signers?: Signer[];
}

export default function Dashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      if (message === "Invalid token") {
        router.push("/login");
      } else {
        toast.error("Failed to load requests", { description: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemind = async (id: string) => {
    try {
      const res = await api.remindRequest(id);
      toast.success("Reminders sent", { description: res.message });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reminder";
      toast.error("Error", { description: message });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this signing request?")) return;
    try {
      await api.cancelRequest(id);
      toast.success("Request cancelled");
      loadRequests();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      toast.error("Error", { description: message });
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(
      (r) => r.status === "pending" || r.status === "in_progress"
    ).length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/send"
            className={buttonVariants({ className: "bg-indigo-600 hover:bg-indigo-700" })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Send Document
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">
                {stats.total}
              </div>
              <div className="text-sm text-gray-500 mt-1">Total Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Awaiting Signatures
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
              <div className="text-sm text-gray-500 mt-1">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Signing Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No signing requests yet.</p>
                <Link
                  href="/send"
                  className={buttonVariants({ className: "mt-4 bg-indigo-600 hover:bg-indigo-700" })}
                >
                  Send your first document
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const Icon = statusIcons[req.status] || Clock;
                  const completedSigners =
                    req.signers?.filter((s) => s.status === "completed")
                      .length || 0;
                  const totalSigners = req.signers?.length || 0;

                  return (
                    <div
                      key={req._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/requests/${req._id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <Icon
                          className={`h-5 w-5 ${
                            req.status === "completed"
                              ? "text-green-600"
                              : "text-yellow-500"
                          }`}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {req.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {req.documentId?.originalName} &bull;{" "}
                            {completedSigners}/{totalSigners} signed
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            statusColors[req.status]
                          }`}
                        >
                          {req.status.replace("_", " ")}
                        </span>
                        <Link
                          href={`/requests/${req._id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {req.status === "completed" &&
                          req.completedFilePath && (
                            <a
                              href={getCompletedFileUrl(req.completedFilePath)}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        {(req.status === "pending" ||
                          req.status === "in_progress") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemind(req._id)}
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(req._id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
