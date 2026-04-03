"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import NavBar from "@/components/NavBar";
import Drawer from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Upload, Search, ChevronRight, Mail, Building2, Users } from "lucide-react";

interface Contact {
  _id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  totalSent: number;
  totalCompleted: number;
  tags: string[];
  createdAt: string;
}

interface CsvRow { [key: string]: unknown; name: string; email: string; company?: string; }

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers    = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx    = headers.indexOf("name");
  const emailIdx   = headers.indexOf("email");
  const companyIdx = headers.indexOf("company");
  if (nameIdx === -1 || emailIdx === -1) return [];
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return { name: cols[nameIdx] || "", email: cols[emailIdx] || "", company: companyIdx >= 0 ? cols[companyIdx] : "" };
  }).filter((r) => r.name && r.email);
}

export default function ContactsPage() {
  useRequireAuth();
  const router = useRouter();
  const [contacts, setContacts]     = useState<Contact[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvRows, setCsvRows]       = useState<CsvRow[]>([]);
  const [importing, setImporting]   = useState(false);

  const [form, setForm]   = useState({ name: "", email: "", company: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const load = (q = search) => {
    const params: Record<string, string> = {};
    if (q) params.search = q;
    api.getContacts(params)
      .then((d: { contacts: Contact[] }) => { setContacts(d.contacts); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      const c = await api.createContact(form);
      setContacts((prev) => [c, ...prev]);
      setDrawerOpen(false);
      setForm({ name: "", email: "", company: "", phone: "" });
      toast.success("Contact added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create contact");
    } finally { setSaving(false); }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target?.result as string);
      if (!rows.length) { toast.error("No valid rows found. Ensure columns: name, email"); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvRows.length) return;
    setImporting(true);
    try {
      const result = await api.importContacts(csvRows);
      toast.success(`Imported: ${result.created} new, ${result.skipped} existing`);
      setImportOpen(false);
      setCsvRows([]);
      load();
    } catch { toast.error("Import failed"); } finally { setImporting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setDrawerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search by name, email, company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Contacts Card */}
        <Card>
          <CardHeader>
            <CardTitle>All Contacts ({contacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{search ? "No contacts found" : "No contacts yet"}</p>
                {!search && (
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => setDrawerOpen(true)}>
                    Add your first contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/contacts/${c._id}`)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{c.email}</span>
                          {c.company && <span className="flex items-center gap-1 hidden sm:flex"><Building2 className="h-3.5 w-3.5" />{c.company}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden md:block">
                        <div className="text-sm font-medium text-gray-900">{c.totalSent}</div>
                        <div className="text-xs text-gray-400">documents sent</div>
                      </div>
                      {c.totalCompleted > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium hidden lg:inline">
                          {c.totalCompleted} completed
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Contact Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Contact">
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
          </div>
          <div>
            <Label>Company</Label>
            <Input className="mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Add Contact"}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Import CSV Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-1">Import Contacts from CSV</h2>
            <p className="text-sm text-gray-500 mb-4">
              Your CSV must have columns: <code className="bg-gray-100 px-1 rounded">name</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">email</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">company</code> (optional)
            </p>
            <label className="cursor-pointer block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {csvRows.length > 0 ? `${csvRows.length} contacts ready to import` : "Click to select a CSV file"}
              </p>
            </label>
            {csvRows.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Company</th></tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.email}</td>
                        <td className="p-2">{r.company}</td>
                      </tr>
                    ))}
                    {csvRows.length > 20 && (
                      <tr><td colSpan={3} className="p-2 text-center text-gray-400">+{csvRows.length - 20} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(false); setCsvRows([]); }}>Cancel</Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={!csvRows.length || importing}
                onClick={handleImport}
              >
                {importing ? "Importing..." : `Import ${csvRows.length} contacts`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
