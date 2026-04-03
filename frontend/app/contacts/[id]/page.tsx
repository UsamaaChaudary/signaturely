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
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "declined")  return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  if (loading) return <PageLayout><div className="text-gray-400 text-center py-16">Loading...</div></PageLayout>;
  if (!contact) return <PageLayout><div className="text-gray-400 text-center py-16">Contact not found</div></PageLayout>;

  const completed = requests.filter((r) => r.status === "completed").length;
  const pending   = requests.filter((r) => r.status === "pending" || r.status === "in_progress").length;

  return (
    <PageLayout>
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/contacts")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contacts
      </Button>

      {/* Contact header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        {editing ? (
          <div className="space-y-3 max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Company</Label><Input className="mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Phone</Label><Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><textarea className="mt-1 w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" />Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold">
                {contact.name[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{contact.name}</h1>
                <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{contact.email}</span>
                  {contact.company && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{contact.company}</span>}
                  {contact.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{contact.phone}</span>}
                </div>
                {contact.notes && <p className="text-sm text-gray-400 mt-1 italic">{contact.notes}</p>}
                <p className="text-xs text-gray-400 mt-1">Added {new Date(contact.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" />Edit
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push(`/send?contactId=${id}`)}>
                <Send className="h-4 w-4 mr-1" />Send Document
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Sent",  value: contact.totalSent      },
          { label: "Pending",     value: pending                },
          { label: "Completed",   value: completed              },
          { label: "Declined",    value: requests.filter((r) => r.signers?.some((s) => s.status === "declined")).length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Document history */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Document History</h2>
      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400">No documents sent to this contact yet.</p>
          <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push(`/send?contactId=${id}`)}>
            <Send className="h-4 w-4 mr-2" />Send First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req._id}>
              <RequestRow request={req} compact onRemind={handleRemind} onCancel={handleCancel} />
              {/* Per-signer audit trail (compact) */}
              {req.signers && req.signers.length > 0 && (
                <div className="ml-4 mt-1 mb-1 space-y-1">
                  {req.signers.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-gray-500 pl-3 border-l-2 border-gray-100">
                      {signerIcon(s.status)}
                      <span>{s.name} ({s.email})</span>
                      {s.signedAt && <span className="text-gray-400">· Signed {new Date(s.signedAt).toLocaleString()}</span>}
                      {s.viewedAt && !s.signedAt && <span className="text-gray-400">· Viewed {new Date(s.viewedAt).toLocaleString()}</span>}
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
