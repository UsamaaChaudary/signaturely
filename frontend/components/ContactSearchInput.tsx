"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Signer } from "@/components/FieldPlacer";
import { Search, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Contact {
  _id: string;
  name: string;
  email: string;
  company?: string;
}

interface Props {
  signers: Signer[];
  onChange: (signers: Signer[]) => void;
  allowManual?: boolean;
}

export default function ContactSearchInput({ signers, onChange, allowManual = true }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.getContacts({ search: query, limit: "8" });
        setResults(data.contacts || []);
        setShowDropdown(true);
      } catch { setResults([]); }
    }, 300);
  }, [query]);

  const addFromContact = (contact: Contact) => {
    if (signers.some((s) => s.email === contact.email)) return;
    // Replace the first empty slot if one exists, otherwise append
    const emptyIdx = signers.findIndex((s) => !s.name && !s.email);
    if (emptyIdx !== -1) {
      const updated = [...signers];
      updated[emptyIdx] = { ...updated[emptyIdx], name: contact.name, email: contact.email, contactId: contact._id };
      onChange(updated);
    } else {
      const newId = (signers.length + 1).toString();
      onChange([...signers, { id: newId, name: contact.name, email: contact.email, contactId: contact._id }]);
    }
    setQuery("");
    setShowDropdown(false);
  };

  const addManual = () => {
    if (!query.includes("@")) return;
    if (signers.some((s) => s.email === query.trim())) return;
    const newId = (signers.length + 1).toString();
    onChange([...signers, { id: newId, name: query.trim(), email: query.trim(), contactId: null }]);
    setQuery("");
  };

  const remove = (id: string) => {
    if (signers.length === 1) return;
    onChange(signers.filter((s) => s.id !== id).map((s, i) => ({ ...s, id: (i + 1).toString() })));
  };

  const updateSigner = (id: string, field: "name" | "email", value: string) => {
    onChange(signers.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <div className="space-y-3">
      {/* Search / add input */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search contacts or type an email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {results.map((c) => (
              <button
                key={c._id}
                onClick={() => addFromContact(c)}
                className="cursor-pointer w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Signer list */}
      <div className="space-y-2">
        {signers.map((signer, i) => (
          <div key={signer.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-white">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            {signer.contactId ? (
              // Contact-linked: show read-only
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{signer.name}</p>
                <p className="text-xs text-gray-500 truncate">{signer.email}</p>
              </div>
            ) : (
              // Manual entry: editable
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Full name"
                  value={signer.name}
                  onChange={(e) => updateSigner(signer.id, "name", e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={signer.email}
                  onChange={(e) => updateSigner(signer.id, "email", e.target.value)}
                />
              </div>
            )}
            {signers.length > 1 && (
              <button onClick={() => remove(signer.id)} className="cursor-pointer text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {allowManual && (
        <button
          onClick={() => {
            const newId = (signers.length + 1).toString();
            onChange([...signers, { id: newId, name: "", email: "", contactId: null }]);
          }}
          className="cursor-pointer flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <UserPlus className="h-4 w-4" /> Add signer manually
        </button>
      )}
    </div>
  );
}
