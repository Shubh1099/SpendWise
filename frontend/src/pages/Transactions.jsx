import { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import {
  Plus,
  Pencil,
  Trash2,
  Paperclip,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  Upload,
  X,
  FileText,
  Download,
  Wand2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import Modal from "../components/Modal";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCsv,
  scanReceiptPreview,
  scanReceiptCreate,
} from "../api/transactionApi";
import { getCategories } from "../api/categoryApi";
import { uploadReceipt } from "../api/receiptApi";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { CategoryIcon } from "../utils/categoryIcons";
import { useToast } from "../hooks/useToast";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/* ───── helpers ───── */

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3.5 px-6 animate-pulse">
      <div className="h-4 w-20 rounded bg-border" />
      <div className="h-4 flex-1 rounded bg-border" />
      <div className="h-5 w-20 rounded-full bg-border" />
      <div className="h-4 w-24 rounded bg-border" />
      <div className="h-4 w-16 rounded bg-border" />
    </div>
  );
}

/* ───── file drop zone ───── */

function DropZone({ file, onFile, onClear }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-muted">Receipt</label>
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm">
          <FileText size={16} className="text-primary shrink-0" />
          <span className="flex-1 truncate text-text-primary">{file.name}</span>
          <button type="button" onClick={onClear} className="text-text-muted hover:text-danger cursor-pointer">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors ${
            dragOver
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-background text-text-muted hover:border-primary hover:text-primary"
          }`}
        >
          <Upload size={20} />
          <span>Drop file or click to browse</span>
          <span className="text-xs text-text-muted/60">.png, .jpg, .pdf</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
        className="hidden"
      />
    </div>
  );
}

/* ───── image compression helper ───── */

function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    if (file.type === "application/pdf" || file.size <= 4 * 1024 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/* ───── scan receipt tab ───── */

function ScanReceiptTab({ categories, toast, onSaved, onClose }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [userShare, setUserShare] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);

  // Editable fields from scan result
  const [editForm, setEditForm] = useState(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setUserShare("");
    setScanning(false);
    setSaving(false);
    setEditForm(null);
    setItemsOpen(false);
  }

  function handleFile(f) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setEditForm(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function handleScan() {
    if (!file) return;
    setScanning(true);
    try {
      const compressed = await compressImage(file);
      const { data } = await scanReceiptPreview(compressed);
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === data.suggestedCategory?.toLowerCase()
      );
      setEditForm({
        description: data.extractedDescription || "",
        amount: userShare || data.extractedAmount || "",
        transactionDate: data.extractedDate || dayjs().format("YYYY-MM-DD"),
        categoryId: matchedCat?.id || categories.find((c) => c.name.toLowerCase() === "other")?.id || categories[0]?.id || "",
        confidence: data.confidence || "LOW",
        allItems: data.allItems || [],
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Couldn't read the receipt. Try a clearer image or enter manually."
      );
    } finally {
      setScanning(false);
    }
  }

  async function handleConfirm() {
    if (!editForm) return;
    setSaving(true);
    try {
      const compressed = await compressImage(file);
      // Use regular create + receipt upload with the edited values
      const payload = {
        amount: Number(editForm.amount),
        description: editForm.description,
        categoryId: editForm.categoryId,
        transactionDate: editForm.transactionDate,
      };
      const { data: txn } = await createTransaction(payload);
      await uploadReceipt(txn.id, compressed);
      toast.success("Transaction logged from receipt \u2713");
      onSaved();
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  function setEdit(key) {
    return (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const confidenceColor =
    editForm?.confidence === "HIGH"
      ? "bg-emerald-500/15 text-emerald-400"
      : editForm?.confidence === "MEDIUM"
      ? "bg-amber-500/15 text-amber-400"
      : "bg-red-500/15 text-red-400";

  return (
    <div className="space-y-4">
      {/* Top section: upload + your share */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* LEFT: Upload zone */}
        <div className="flex-[3] min-w-0">
          {file && preview ? (
            <div className="relative rounded-lg border-2 border-dashed border-border bg-background p-3 flex flex-col items-center gap-2" style={{ minHeight: 250 }}>
              <button
                type="button"
                onClick={() => { reset(); }}
                className="absolute top-2 right-2 rounded-md p-1 text-text-muted hover:text-danger cursor-pointer"
              >
                <X size={16} />
              </button>
              {file.type === "application/pdf" ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 py-8">
                  <FileText size={48} className="text-primary" />
                  <span className="text-sm text-text-primary truncate max-w-full">{file.name}</span>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="max-h-52 rounded object-contain"
                />
              )}
              {!editForm && (
                <Button
                  type="button"
                  onClick={handleScan}
                  disabled={scanning}
                  className="mt-2 !bg-emerald-600 hover:!bg-emerald-700"
                >
                  {scanning ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Wand2 size={16} />
                  )}
                  {scanning ? "Scanning..." : "Scan Receipt"}
                </Button>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 text-sm transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background text-text-muted hover:border-primary hover:text-primary"
              }`}
              style={{ minHeight: 250 }}
            >
              <Upload size={32} />
              <span className="font-medium">Drop receipt or click to browse</span>
              <span className="text-xs text-text-muted/60">.png, .jpg, .jpeg, .pdf</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            className="hidden"
          />
        </div>

        {/* RIGHT: Your Share */}
        <div className="flex-[2] min-w-0 space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-muted">Your Share</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">\u20B9</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={userShare}
                onChange={(e) => setUserShare(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-7 pr-3 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors focus:border-primary"
              />
            </div>
            <p className="text-xs text-text-muted/70">Leave empty to use the full receipt total</p>
          </div>
          <p className="text-xs text-text-muted/60 leading-relaxed">
            Splitting the bill? Enter just your share and we'll use that instead of the total.
          </p>
        </div>
      </div>

      {/* Scanning skeleton */}
      {scanning && (
        <div className="rounded-lg border border-border bg-background/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 size={18} className="animate-spin text-emerald-400" />
            <span className="text-sm text-text-muted">Analyzing receipt with AI...</span>
          </div>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-3/4 rounded bg-border" />
            <div className="h-4 w-1/2 rounded bg-border" />
            <div className="h-4 w-2/3 rounded bg-border" />
          </div>
        </div>
      )}

      {/* Extracted preview (editable) */}
      {editForm && !scanning && (
        <div className="rounded-lg border border-border bg-background/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Extracted Details</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColor}`}>
              {editForm.confidence}
            </span>
          </div>

          {editForm.confidence === "LOW" && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300">
                AI confidence is low — please verify the extracted details before saving.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              required
              value={editForm.amount}
              onChange={setEdit("amount")}
            />
            <Input
              label="Date"
              type="date"
              required
              value={editForm.transactionDate}
              onChange={setEdit("transactionDate")}
            />
          </div>
          <Input
            label="Description"
            required
            value={editForm.description}
            onChange={setEdit("description")}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={editForm.categoryId}
            onChange={setEdit("categoryId")}
          />

          {/* Line items */}
          {editForm.allItems?.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setItemsOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary cursor-pointer"
              >
                {itemsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {editForm.allItems.length} item{editForm.allItems.length > 1 ? "s" : ""} detected
              </button>
              {itemsOpen && (
                <div className="mt-2 rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_80px] gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wider text-text-muted font-semibold border-b border-border">
                    <span>Item</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Price</span>
                  </div>
                  {editForm.allItems.map((item, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_60px_80px] gap-2 px-3 py-1.5 text-sm text-text-primary border-b border-border last:border-0"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-center text-text-muted">{item.quantity}</span>
                      <span className="text-right font-medium">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Confirm & Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── transaction form modal ───── */

function TransactionModal({ open, onClose, onSaved, editing, categories, toast }) {
  const [tab, setTab] = useState("manual");
  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    transactionDate: dayjs().format("YYYY-MM-DD"),
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTab("manual");
        setForm({
          amount: editing.amount,
          description: editing.description,
          categoryId: editing.categoryId,
          transactionDate: editing.transactionDate,
        });
      } else {
        setForm({
          amount: "",
          description: "",
          categoryId: categories[0]?.id || "",
          transactionDate: dayjs().format("YYYY-MM-DD"),
        });
      }
      setFile(null);
      setSaving(false);
    }
  }, [open, editing, categories]);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        description: form.description,
        categoryId: form.categoryId,
        transactionDate: form.transactionDate,
      };
      let txn;
      if (editing) {
        const res = await updateTransaction(editing.id, payload);
        txn = res.data;
      } else {
        const res = await createTransaction(payload);
        txn = res.data;
      }
      if (file) {
        await uploadReceipt(txn.id, file);
      }
      toast.success(editing ? "Transaction updated" : "Transaction created");
      onSaved();
    } catch {
      toast.error("Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Transaction" : "Add Transaction"} size={!editing && tab === "scan" ? "lg" : undefined}>
      {/* Tabs — only show when not editing */}
      {!editing && (
        <div className="flex border-b border-border mb-4 -mt-1">
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === "manual"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setTab("scan")}
            className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === "scan"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Scan Receipt
          </button>
        </div>
      )}

      {/* Manual Entry Tab */}
      {(tab === "manual" || editing) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={form.amount}
              onChange={set("amount")}
            />
            <Input
              label="Date"
              type="date"
              required
              value={form.transactionDate}
              onChange={set("transactionDate")}
            />
          </div>
          <Input
            label="Description"
            required
            placeholder="What did you spend on?"
            value={form.description}
            onChange={set("description")}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={form.categoryId}
            onChange={set("categoryId")}
          />
          <DropZone file={file} onFile={setFile} onClear={() => setFile(null)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Update" : "Add"} Transaction
            </Button>
          </div>
        </form>
      )}

      {/* Scan Receipt Tab */}
      {tab === "scan" && !editing && (
        <ScanReceiptTab
          categories={categories}
          toast={toast}
          onSaved={onSaved}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

/* ───── delete confirmation modal ───── */

function DeleteModal({ open, onClose, onConfirm, deleting }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Transaction">
      <p className="text-sm text-text-muted mb-6">
        Are you sure you want to delete this transaction? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={deleting}>
          {deleting && <Loader2 size={16} className="animate-spin" />}
          Delete
        </Button>
      </div>
    </Modal>
  );
}

/* ───── main page ───── */

export default function Transactions() {
  const toast = useToast();
  const now = dayjs();
  const [month, setMonth] = useState(now.month() + 1);
  const [year, setYear] = useState(now.year());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await getCategories();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    }
  }, [toast]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month, year };
      if (categoryFilter) params.categoryId = categoryFilter;
      const { data } = await getTransactions(params);
      const sorted = (data || []).sort(
        (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
      );
      setTransactions(sorted);
    } catch {
      setTransactions([]);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [month, year, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  /* month nav */
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  /* modal handlers */
  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(txn) {
    setEditing(txn);
    setModalOpen(true);
  }
  function handleSaved() {
    setModalOpen(false);
    setEditing(null);
    fetchTransactions();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      toast.success("Transaction deleted");
      setDeleteTarget(null);
      fetchTransactions();
    } catch {
      toast.error("Failed to delete transaction");
    }
    finally { setDeleting(false); }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const params = { month, year };
      if (categoryFilter) params.categoryId = categoryFilter;
      const { data } = await exportTransactionsCsv(params);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_${year}_${String(month).padStart(2, "0")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  function viewReceipt(txn) {
    const url = txn.receipt?.downloadUrl;
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Could not load receipt. Please try again.");
    }
  }

  /* client-side search filter */
  const filtered = search
    ? transactions.filter((t) =>
        t.description.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const isEmpty = !loading && filtered.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="secondary" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={openAdd}>
            <Plus size={16} /> <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Month Nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="rounded-lg border border-border bg-background p-2 text-text-muted transition-colors hover:text-text-primary cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-text-primary">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-lg border border-border bg-background p-2 text-text-muted transition-colors hover:text-text-primary cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Category Filter */}
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="!py-2"
          />

          {/* Search */}
          <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3.5 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors focus:border-primary"
            />
          </div>
        </div>
      </Card>

      {/* Table — desktop */}
      <Card className="!p-0 overflow-hidden hidden md:block">
        {/* Header row */}
        <div className="flex items-center gap-4 border-b border-border bg-background/50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <span className="w-24 shrink-0">Date</span>
          <span className="flex-1">Description</span>
          <span className="w-28">Category</span>
          <span className="w-28 text-right">Amount</span>
          <span className="w-10 text-center">
            <Paperclip size={13} />
          </span>
          <span className="w-20 text-right">Actions</span>
        </div>

        {/* Loading */}
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {/* Empty */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16">
            <Inbox size={48} className="text-text-muted/40 mb-3" />
            <p className="text-sm font-semibold text-text-muted">No transactions found</p>
            <button
              onClick={openAdd}
              className="mt-3 text-sm font-medium text-primary hover:underline cursor-pointer"
            >
              Add your first transaction
            </button>
          </div>
        )}

        {/* Rows */}
        {!loading && (
          <div className="divide-y divide-border">
            {filtered.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-background/40"
              >
                <span className="w-24 shrink-0 text-sm text-text-muted">
                  {formatDate(txn.transactionDate)}
                </span>
                <span className="flex-1 truncate text-sm text-text-primary flex items-center gap-2">
                  {txn.description}
                  {txn.source === "TELEGRAM" && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">Telegram</span>
                  )}
                  {txn.source === "RECEIPT" && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">Receipt</span>
                  )}
                </span>
                <span className="w-28">
                  <Badge variant="secondary">
                    <CategoryIcon name={txn.categoryIcon} size={14} className="shrink-0" />
                    {txn.categoryName}
                  </Badge>
                </span>
                <span className="w-28 text-right font-[Outfit] text-sm font-semibold text-primary">
                  {formatCurrency(txn.amount)}
                </span>
                <span className="w-10 flex justify-center">
                  {txn.receipt ? (
                    <button
                      onClick={() => viewReceipt(txn)}
                      title="View Receipt"
                      className="text-text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <Paperclip size={15} />
                    </button>
                  ) : (
                    <span className="text-border">—</span>
                  )}
                </span>
                <span className="w-20 flex justify-end gap-1.5">
                  <button
                    onClick={() => openEdit(txn)}
                    title="Edit"
                    className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-background hover:text-primary cursor-pointer"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(txn)}
                    title="Delete"
                    className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-background hover:text-danger cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Card list — mobile */}
      <div className="space-y-3 md:hidden">
        {/* Loading */}
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse space-y-3">
                <div className="h-4 w-3/4 rounded bg-border" />
                <div className="h-4 w-1/2 rounded bg-border" />
              </Card>
            ))}
          </>
        )}

        {/* Empty */}
        {isEmpty && (
          <Card className="flex flex-col items-center justify-center py-16">
            <Inbox size={48} className="text-text-muted/40 mb-3" />
            <p className="text-sm font-semibold text-text-muted">No transactions found</p>
            <button
              onClick={openAdd}
              className="mt-3 text-sm font-medium text-primary hover:underline cursor-pointer"
            >
              Add your first transaction
            </button>
          </Card>
        )}

        {/* Transaction cards */}
        {!loading && filtered.map((txn) => (
          <Card key={txn.id} className="!p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary flex items-center gap-2">
                  {txn.description}
                  {txn.source === "TELEGRAM" && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">Telegram</span>
                  )}
                  {txn.source === "RECEIPT" && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">Receipt</span>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span>{formatDate(txn.transactionDate)}</span>
                  <span className="text-border">·</span>
                  <Badge variant="secondary">
                    <CategoryIcon name={txn.categoryIcon} size={12} className="shrink-0" />
                    {txn.categoryName}
                  </Badge>
                </div>
              </div>
              <span className="shrink-0 font-[Outfit] text-sm font-semibold text-primary">
                {formatCurrency(txn.amount)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <div>
                {txn.receipt && (
                  <button
                    onClick={() => viewReceipt(txn)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    <Paperclip size={13} /> Receipt
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(txn)}
                  title="Edit"
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-background hover:text-primary cursor-pointer"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteTarget(txn)}
                  title="Delete"
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-background hover:text-danger cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={handleSaved}
        editing={editing}
        categories={categories}
        toast={toast}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
