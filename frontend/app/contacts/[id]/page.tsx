"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import PageLayout from "@/components/PageLayout";
import RequestRow from "@/components/RequestRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Send, Mail, Building2, Phone, Edit2, Check, X, CheckCircle, Clock, XCircle } from "lucide-react";

interface Signer { name: string; email: string; status: string; signedAt?: string; viewedAt?: string; ipAddress?: string; }
interface Request { _id: string; title: string; status: string; createdAt: string; completedFilePath?: string; documentId?: { originalName: string }; signers?: Signer[]; }
interface Contact { _id: string; name: string; email: string; company: string; phone: string; notes: string; totalSent: number; totalCompleted: number; createdAt: string; }

export default function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  useRequireAuth();
  const { id } = use(params);
  const router  = useRouter();

  const [contact,  setContact]  = useState<Contact | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ name: "", email: "", company: "", phone: "", notes: "" });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.getContact(id)
      .then((data: { contact: Contact; requests: Request[] }) => {
        setContact(data.contact);
        setRequests(data.requests);
        setForm({ name: data.contact.name, email: data.contact.email, company: data.contact.company, phone: data.contact.phone, notes: data.contact.notes });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateContact(id, form);
      setContact(updated);
      setEditing(false);
      toast.success("Contact updated");
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  };

  const handleRemind = async (reqId: string) => {
    try { await api.remindRequest(reqId); toast.success("Reminder sent"); } catch { toast.error("Failed"); }
  };

  const handleCancel = async (reqId: string) => {
    if (!confirm("Cancel this request?")) return;
    try {
      await api.cancelRequest(reqId);
      setRequests((prev) => prev.map((r) => r._id === reqId ? { ...r, status: "cancelled" } : r));
      toast.success("Cancelled");
    } catch { toast.error("Failed"); }
  };

  const signerIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />;
    if (status === "declined")  return <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />;
    return <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />;
  };

  if (loading) return <PageLayout><div className="text-gray-400 text-center py-16">Loading...</div></PageLayout>;
  if (!contact) return <PageLayout><div className="text-gray-400 text-center py-16">Contact not found</div></PageLayout>;

  const completed = requests.filter((r) => r.status === "completed").length;
  const pending   = requests.filter((r) => r.status === "pending" || r.status === "in_progress").length;

  return (
    <PageLayout>
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-3 sm:mb-4" onClick={() => router.push("/contacts")}>
        <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> <span className="hidden sm:inline">Back to Contacts</span>
      </Button>

      {/* Contact header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6 mb-4 sm:mb-6">
        {editing ? (
          <div className="space-y-3 max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs sm:text-sm">Name</Label><Input className="mt-1 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="text-xs sm:text-sm">Email</Label><Input className="mt-1 text-sm" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label className="text-xs sm:text-sm">Company</Label><Input className="mt-1 text-sm" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label className="text-xs sm:text-sm">Phone</Label><Input className="mt-1 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs sm:text-sm">Notes</Label><textarea className="mt-1 w-full border border-gray-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm" onClick={handleSave} disabled={saving}>
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />{saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs sm:text-sm" onClick={() => setEditing(false)}>
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg sm:text-xl font-bold">
                {contact.name[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">{contact.name}</h1>
                <div className="flex flex-wrap gap-2 sm:gap-4 mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 sm:h-4 sm:w-4" /><span className="truncate max-w-[120px] sm:max-w-none">{contact.email}</span></span>
                  {contact.company && <span className="flex items-center gap-1 hidden sm:flex"><Building2 className="h-3 w-3 sm:h-4 sm:w-4" />{contact.company}</span>}
                  {contact.phone && <span className="flex items-center gap-1 hidden sm:flex"><Phone className="h-3 w-3 sm:h-4 sm:w-4" />{contact.phone}</span>}
                </div>
                {contact.notes && <p className="text-xs text-gray-400 mt-1 italic hidden sm:block">{contact.notes}</p>}
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">Added {new Date(contact.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2 ml-auto sm:ml-0">
              <Button variant="outline" size="sm" className="text-xs py-1 h-7 sm:h-8" onClick={() => setEditing(true)}>
                <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />Edit
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1 h-7 sm:h-8" onClick={() => router.push(`/send?contactId=${id}`)}>
                <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> <span className="hidden sm:inline">Send Document</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: "Total Sent",  value: contact.totalSent      },
          { label: "Pending",     value: pending                },
          { label: "Completed",   value: completed              },
          { label: "Declined",    value: requests.filter((r) => r.signers?.some((s) => s.status === "declined")).length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Document history */}
      <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Document History</h2>
      {requests.length === 0 ? (
        <div className="text-center py-8 sm:py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">No documents sent to this contact yet.</p>
          <Button className="mt-3 sm:mt-4 bg-indigo-600 hover:bg-indigo-700 text-sm" onClick={() => router.push(`/send?contactId=${id}`)}>
            <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />Send First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {requests.map((req) => (
            <div key={req._id}>
              <RequestRow request={req} compact onRemind={handleRemind} onCancel={handleCancel} />
              {/* Per-signer audit trail (compact) */}
              {req.signers && req.signers.length > 0 && (
                <div className="ml-2 sm:ml-4 mt-0.5 sm:mt-1 mb-1 space-y-0.5 sm:space-y-1">
                  {req.signers.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 pl-2 sm:pl-3 border-l-2 border-gray-100">
                      {signerIcon(s.status)}
                      <span className="truncate">{s.name} ({s.email})</span>
                      {s.signedAt && <span className="text-gray-400 hidden sm:inline">· Signed {new Date(s.signedAt).toLocaleString()}</span>}
                      {s.viewedAt && !s.signedAt && <span className="text-gray-400 hidden sm:inline">· Viewed {new Date(s.viewedAt).toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
