"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { api, getCompletedFileUrl } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Bell,
  X,
  CheckCircle,
  Clock,
  Eye,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const signerStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  viewed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

const requestStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

interface SignerRecord {
  _id: string;
  name: string;
  email: string;
  status: string;
  signedAt?: string;
  viewedAt?: string;
  ipAddress?: string;
}

interface FieldRecord {
  _id: string;
  type: string;
  page: number;
  signerId: string;
  value?: string;
  required: boolean;
}

interface RequestDetail {
  _id: string;
  title: string;
  status: string;
  message?: string;
  createdAt: string;
  completedFilePath?: string;
  documentId?: { originalName: string };
  signers: SignerRecord[];
  fields: FieldRecord[];
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequest = async () => {
    try {
      const data = await api.getRequest(id);
      setRequest(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleRemind = async () => {
    try {
      const res = await api.remindRequest(id);
      toast.success("Reminders sent", { description: res.message });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reminder";
      toast.error("Error", { description: message });
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this signing request?")) return;
    try {
      await api.cancelRequest(id);
      toast.success("Request cancelled");
      loadRequest();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      toast.error("Error", { description: message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="text-center py-16 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="text-center py-16 text-gray-500">Request not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex-1">
            {request.title}
          </h1>
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${
              requestStatusColors[request.status] ||
              "bg-gray-100 text-gray-800"
            }`}
          >
            {request.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Signers */}
            <Card>
              <CardHeader>
                <CardTitle>Signers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.signers.map((signer) => {
                  const Icon =
                    signer.status === "completed"
                      ? CheckCircle
                      : signer.status === "declined"
                      ? XCircle
                      : signer.status === "viewed"
                      ? Eye
                      : Clock;
                  return (
                    <div
                      key={signer._id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-5 w-5 ${
                            signer.status === "completed"
                              ? "text-green-500"
                              : signer.status === "declined"
                              ? "text-red-500"
                              : signer.status === "viewed"
                              ? "text-blue-400"
                              : "text-gray-400"
                          }`}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {signer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {signer.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            signerStatusColors[signer.status] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {signer.status}
                        </span>
                        {signer.signedAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Signed{" "}
                            {new Date(signer.signedAt).toLocaleString()}
                          </div>
                        )}
                        {signer.viewedAt && !signer.signedAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Viewed{" "}
                            {new Date(signer.viewedAt).toLocaleString()}
                          </div>
                        )}
                        {signer.ipAddress && (
                          <div className="text-xs text-gray-400">
                            {signer.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Fields summary */}
            <Card>
              <CardHeader>
                <CardTitle>Fields ({request.fields.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {request.fields.map((field) => {
                    const signer = request.signers.find(
                      (s) => s._id === field.signerId
                    );
                    return (
                      <div
                        key={field._id}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100"
                      >
                        <span className="text-gray-600 capitalize">
                          {field.type} field (page {field.page + 1})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">
                            {signer?.name || "Unknown"}
                          </span>
                          {field.value ? (
                            <span className="text-green-500 text-xs">
                              Filled
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {request.status === "completed" &&
                  request.completedFilePath && (
                    <a
                      href={getCompletedFileUrl(request.completedFilePath)}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        className: "w-full bg-green-600 hover:bg-green-700",
                      })}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Signed PDF
                    </a>
                  )}
                {(request.status === "pending" ||
                  request.status === "in_progress") && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleRemind}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Send Reminder
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-red-500 hover:text-red-600"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Request
                    </Button>
                  </>
                )}
                {request.status === "cancelled" && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    This request has been cancelled
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-gray-600">
                <div>
                  <span className="font-medium">Document:</span>{" "}
                  {request.documentId?.originalName}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
                {request.message && (
                  <div>
                    <span className="font-medium">Message:</span>{" "}
                    {request.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
