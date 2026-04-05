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
import {
  UserPlus, ArrowDownToLine, Search, ChevronRight, Mail,
  Building2, Users, AlertCircle, CheckCircle2, FileText, X, ZoomIn, ZoomOut,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface MappingConfig {
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
  keepExtra: boolean;
}

type ImportStep = "upload" | "map";

// ─── CSV Utilities ─────────────────────────────────────────────────────────────

function parseCsvRaw(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (c === "," && !inQ) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines
    .slice(1)
    .map((line) => {
      const cols = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
      return row;
    })
    .filter((row) => Object.values(row).some(Boolean));

  return { headers, rows };
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "full name", "fullname", "full_name", "contact name", "contact", "person", "customer name", "client name"],
  email: ["email", "e-mail", "email address", "emailaddress", "mail", "e mail", "email_address"],
  company: ["company", "organization", "organisation", "org", "company name", "employer", "business", "account", "account name"],
  phone: ["phone", "tel", "telephone", "mobile", "cell", "phone number", "phonenumber", "mobile number", "phone_number", "contact number"],
  notes: ["notes", "note", "comment", "comments", "description", "remarks", "memo", "info", "additional info"],
};

function autoDetect(headers: string[]): MappingConfig {
  const cfg: MappingConfig = { name: "", email: "", company: "", phone: "", notes: "", keepExtra: false };
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = lower.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
    if (idx !== -1) (cfg as unknown as Record<string, unknown>)[field] = headers[idx];
  }
  return cfg;
}

function nameFromEmail(email: string): string {
  return email.split("@")[0] || email;
}

function buildContacts(rawRows: Record<string, string>[], m: MappingConfig, allHeaders: string[]) {
  const mapped = new Set([m.name, m.email, m.company, m.phone, m.notes].filter(Boolean));
  const extras = allHeaders.filter((h) => !mapped.has(h));
  return rawRows.map((row) => {
    const email = m.email ? (row[m.email] || "") : "";
    const rawName = m.name ? (row[m.name] || "") : "";
    const c: Record<string, unknown> = {
      name: rawName || (email ? nameFromEmail(email) : ""),
      email,
      company: m.company ? (row[m.company] || "") : "",
      phone: m.phone ? (row[m.phone] || "") : "",
      notes: m.notes ? (row[m.notes] || "") : "",
    };
    if (m.keepExtra && extras.length) {
      const cf: Record<string, string> = {};
      extras.forEach((h) => { if (row[h]) cf[h] = row[h]; });
      if (Object.keys(cf).length) c.customFields = cf;
    }
    return c;
  });
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  useRequireAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // Import wizard state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [mapping, setMapping] = useState<MappingConfig>({ name: "", email: "", company: "", phone: "", notes: "", keepExtra: false });
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [zoom, setZoom] = useState(1);
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 1.3;

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
    if (!form.email) { toast.error("Email is required"); return; }
    const payload = { ...form, name: form.name || nameFromEmail(form.email) };
    setSaving(true);
    try {
      const c = await api.createContact(payload);
      setContacts((prev) => [c, ...prev]);
      setDrawerOpen(false);
      setForm({ name: "", email: "", company: "", phone: "" });
      toast.success("Contact added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create contact");
    } finally { setSaving(false); }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCsvRaw(ev.target?.result as string);
      if (!headers.length || !rows.length) {
        toast.error("Could not parse CSV — make sure it has headers and at least one data row");
        return;
      }
      setCsvHeaders(headers);
      setCsvRawRows(rows);
      setCsvFileName(file.name);
      setMapping(autoDetect(headers));
      setImportStep("map");
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!mapping.email) {
      toast.error("You must map the Email column");
      return;
    }
    const allContacts = buildContacts(csvRawRows, mapping, csvHeaders);
    const valid = allContacts.filter((c) => (c.email as string));
    if (!valid.length) { toast.error("No valid rows to import — check your Name and Email column mapping"); return; }
    setImporting(true);
    try {
      const result = await api.importContacts(valid);
      toast.success(`Imported: ${result.created} new · ${result.skipped} already existed`);
      resetImport();
      load();
    } catch {
      toast.error("Import failed — please try again");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportOpen(false);
    setImportStep("upload");
    setCsvHeaders([]);
    setCsvRawRows([]);
    setCsvFileName("");
    setMapping({ name: "", email: "", company: "", phone: "", notes: "", keepExtra: false });
    setZoom(1);
  };

  // Derived values for the map step
  const mappedFields = new Set([mapping.name, mapping.email, mapping.company, mapping.phone, mapping.notes].filter(Boolean));
  const extraHeaders = csvHeaders.filter((h) => !mappedFields.has(h));
  const previewContacts = buildContacts(csvRawRows.slice(0, 4), mapping, csvHeaders);
  const allMapped = buildContacts(csvRawRows, mapping, csvHeaders);
  const validCount = allMapped.filter((c) => (c.email as string)).length;
  const invalidCount = csvRawRows.length - validCount;

  const setMappingField = (field: keyof MappingConfig, value: string | boolean) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const SYSTEM_FIELDS: { key: keyof MappingConfig; label: string; required: boolean; hint?: string }[] = [
    { key: "name", label: "Name", required: false, hint: "auto from email if blank" },
    { key: "email", label: "Email", required: true },
    { key: "company", label: "Company", required: false },
    { key: "phone", label: "Phone", required: false },
    { key: "notes", label: "Notes", required: false },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavBar />
      <main className="max-w-6xl mx-auto px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: "var(--foreground)" }}>Contacts</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => { setImportOpen(true); setImportStep("upload"); }} className="w-full sm:w-auto text-sm py-1.5">
              <ArrowDownToLine className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="sm:hidden">Import</span>
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button className="bg-[var(--primary)] hover:opacity-90 w-full sm:w-auto text-sm py-1.5" onClick={() => setDrawerOpen(true)}>
              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Contact</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3 sm:mb-4 md:mb-6 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4" style={{ color: "var(--muted-foreground)" }} />
          <Input className="pl-9 w-full text-sm py-1.5 sm:py-2" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <Button className="mt-4 bg-[var(--primary)] hover:opacity-90" onClick={() => setDrawerOpen(true)}>
                    Add your first contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/contacts/${c._id}`)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 sm:gap-2 mt-0.5">
                          <span className="flex items-center gap-1 truncate max-w-[100px] sm:max-w-none">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate text-[10px] sm:text-xs">{c.email}</span>
                          </span>
                          {c.company && (
                            <span className="flex items-center gap-1 hidden sm:flex text-xs">
                              <Building2 className="h-3 w-3" />{c.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0 ml-auto sm:ml-0">
                      <div className="text-right hidden md:block">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{c.totalSent}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">documents sent</div>
                      </div>
                      {c.totalCompleted > 0 && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium hidden lg:inline">
                          {c.totalCompleted} completed
                        </span>
                      )}
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ─── Add Contact Drawer ─────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Contact">
        <div className="space-y-4">
          <div>
            <Label>Full Name <span className="text-gray-400 font-normal text-xs">(optional — derived from email if blank)</span></Label>
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
            <Button className="flex-1 bg-[var(--primary)] hover:opacity-90" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Add Contact"}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ─── Import CSV Wizard Modal ─────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
            style={{ maxWidth: importStep === "map" ? "720px" : "480px", maxHeight: "90vh" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Import Contacts</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {importStep === "upload" ? "Step 1 of 2 — Upload your file" : "Step 2 of 2 — Map your columns"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {importStep === "map" && (
                  <div className="flex items-center gap-1 mr-2 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(1))))}
                      disabled={zoom <= ZOOM_MIN}
                      title="Zoom out"
                      className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setZoom(1)}
                      className="px-1.5 text-[11px] font-mono font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors min-w-[36px] text-center"
                      title="Reset zoom"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(1))))}
                      disabled={zoom >= ZOOM_MAX}
                      title="Zoom in"
                      className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <button
                  onClick={resetImport}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Step 1: Upload ──────────────────────────────────────────────── */}
            {importStep === "upload" && (
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-sm text-gray-600">Upload a CSV file with your contacts.</p>
                  <p className="text-sm text-gray-500 mt-1"><strong className="text-gray-700">Any column names work</strong> — you&apos;ll map them to our fields in the next step.</p>
                </div>

                {/* Dropzone */}
                <label
                  className={`cursor-pointer block border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                    dragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileInput} />
                  <ArrowDownToLine className={`h-10 w-10 mx-auto mb-3 transition-colors ${dragOver ? "text-blue-400" : "text-gray-300"}`} />
                  <p className="text-sm font-medium text-gray-700">Drop your CSV file here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                  <p className="text-xs text-gray-300 mt-3">.csv files only</p>
                </label>

                <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Your CSV can have any column names — e.g. <em>full_name</em>, <em>e-mail</em>, <em>organization</em>.
                    We&apos;ll auto-detect matches and let you confirm.
                  </p>
                </div>

                <Button variant="outline" className="w-full" onClick={resetImport}>Cancel</Button>
              </div>
            )}

            {/* ── Step 2: Map Columns ─────────────────────────────────────────── */}
            {importStep === "map" && (
              <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 p-6 space-y-5" style={{ zoom }}>

                  {/* File info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate font-medium text-gray-700">{csvFileName}</span>
                    <span className="text-gray-400 flex-shrink-0">{csvRawRows.length} rows · {csvHeaders.length} columns</span>
                    <button
                      onClick={() => { setImportStep("upload"); setCsvHeaders([]); setCsvRawRows([]); setCsvFileName(""); setMapping({ name: "", email: "", company: "", phone: "", notes: "", keepExtra: false }); setZoom(1); }}
                      className="ml-auto flex-shrink-0 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors font-medium"
                      title="Remove this file and start over"
                    >
                      Remove file
                    </button>
                  </div>

                  {/* Column Mapping */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Column mapping</h3>
                    <p className="text-xs text-gray-500 mb-3">We auto-detected matches — adjust any that look wrong.</p>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200 px-4 py-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact field</span>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your CSV column</span>
                      </div>
                      {SYSTEM_FIELDS.map(({ key, label, required, hint }) => {
                        const val = mapping[key] as string;
                        const isAutoDetected = val !== "";
                        return (
                          <div key={key} className="grid grid-cols-2 items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-800 font-medium">{label}</span>
                                {required && <span className="text-xs text-red-500 font-semibold">*</span>}
                                {isAutoDetected && (
                                  <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">auto</span>
                                )}
                              </div>
                              {hint && !val && (
                                <span className="text-[10px] text-gray-400 italic">{hint}</span>
                              )}
                            </div>
                            <div className="relative">
                              <select
                                value={val}
                                onChange={(e) => setMappingField(key, e.target.value)}
                                className={`w-full text-sm border rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                  required && !val
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : val
                                    ? "border-green-300 bg-green-50 text-green-800"
                                    : "border-gray-200 bg-white text-gray-500"
                                }`}
                              >
                                <option value="">— Skip this field —</option>
                                {csvHeaders.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Extra fields */}
                  {extraHeaders.length > 0 && (
                    <div className="border border-dashed border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="keepExtra"
                          checked={mapping.keepExtra}
                          onChange={(e) => setMappingField("keepExtra", e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <label htmlFor="keepExtra" className="text-sm font-medium text-gray-800 cursor-pointer">
                            Import {extraHeaders.length} extra field{extraHeaders.length !== 1 ? "s" : ""} from your CSV
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            These columns don&apos;t map to standard contact fields — we&apos;ll store them as custom data on each contact.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {extraHeaders.map((h) => (
                              <span key={h} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{h}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live preview */}
                  {previewContacts.length > 0 && mapping.email && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Preview — first {previewContacts.length} rows</h3>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                {SYSTEM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                                  <th key={f.key} className="text-left px-3 py-2 text-gray-500 font-semibold whitespace-nowrap">{f.label}</th>
                                ))}
                                {mapping.keepExtra && extraHeaders.length > 0 && (
                                  <th className="text-left px-3 py-2 text-gray-400 font-semibold">+{extraHeaders.length} extra</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {previewContacts.map((row, i) => (
                                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                                  {SYSTEM_FIELDS.filter((f) => f.key === "name" || mapping[f.key]).map((f) => (
                                    <td key={f.key} className="px-3 py-2 text-gray-700 max-w-[160px] truncate">
                                      {(row[f.key] as string)
                                        ? <span>{row[f.key] as string}</span>
                                        : f.key === "name"
                                          ? <span className="text-blue-400 italic text-[10px]">← from email</span>
                                          : <span className="text-gray-300 italic">empty</span>}
                                    </td>
                                  ))}
                                  {mapping.keepExtra && extraHeaders.length > 0 && (
                                    <td className="px-3 py-2 text-gray-400 italic">
                                      {Object.keys((row.customFields as Record<string, string>) || {}).length} fields
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation summary */}
                  {mapping.email && (
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                      invalidCount > 0 ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"
                    }`}>
                      {invalidCount > 0 ? (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span>
                        <strong>{validCount}</strong> contacts ready to import
                        {!mapping.name && validCount > 0 && <> · name will be derived from email</>}
                        {invalidCount > 0 && (
                          <> · <strong>{invalidCount}</strong> row{invalidCount !== 1 ? "s" : ""} skipped (missing Email)</>
                        )}
                      </span>
                    </div>
                  )}

                  {!mapping.email && (
                    <div className="flex items-center gap-2 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>Map the <strong>Email</strong> column to continue.</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setImportStep("upload"); setCsvHeaders([]); setCsvRawRows([]); setCsvFileName(""); setZoom(1); }}
                  >
                    ← Back
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--primary)] hover:opacity-90"
                    disabled={!mapping.email || !validCount || importing}
                    onClick={handleImport}
                  >
                    {importing ? "Importing..." : `Import ${validCount} contact${validCount !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
