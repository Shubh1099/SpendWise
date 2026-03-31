import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Inbox,
} from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import { getCategories, createCategory, deleteCategory } from "../api/categoryApi";
import { getMonthlySummary } from "../api/transactionApi";
import { formatCurrency } from "../utils/formatCurrency";
import { CategoryIcon } from "../utils/categoryIcons";
import { useToast } from "../hooks/useToast";
import dayjs from "dayjs";

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-border" />
        <div className="h-5 w-28 rounded bg-border" />
      </div>
      <div className="h-4 w-20 rounded bg-border mb-2" />
      <div className="h-6 w-24 rounded bg-border" />
    </Card>
  );
}

export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [summaryMap, setSummaryMap] = useState({});
  const [loading, setLoading] = useState(true);

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = dayjs();
      const [catRes, sumRes] = await Promise.all([
        getCategories(),
        getMonthlySummary({ month: now.month() + 1, year: now.year() }),
      ]);
      setCategories(catRes.data || []);
      const map = {};
      (sumRes.data?.categoryBreakdown || []).forEach((b) => {
        map[b.categoryName] = { count: b.count, amount: Number(b.amount) };
      });
      setSummaryMap(map);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createCategory({ name: newName.trim() });
      toast.success("Category created");
      setAddOpen(false);
      setNewName("");
      fetchData();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success("Category deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete category. Remove its transactions first.");
    } finally {
      setDeleting(false);
    }
  }

  const isEmpty = !loading && categories.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Category
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty */}
      {isEmpty && (
        <Card className="flex flex-col items-center justify-center py-20">
          <Inbox size={56} className="text-text-muted/40 mb-4" />
          <p className="text-lg font-semibold text-text-muted">No categories yet</p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-3 text-sm font-medium text-primary hover:underline cursor-pointer"
          >
            Create your first category
          </button>
        </Card>
      )}

      {/* Category Grid */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const stats = summaryMap[cat.name] || { count: 0, amount: 0 };
            return (
              <Card
                key={cat.id}
                className="group relative transition-all duration-200 hover:border-primary/30"
              >
                {/* Delete button */}
                <button
                  onClick={() => setDeleteTarget({ ...cat, txnCount: stats.count })}
                  title="Delete"
                  className="absolute top-4 right-4 rounded-md p-1.5 text-text-muted opacity-0 transition-all hover:bg-background hover:text-danger group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon name={cat.icon} size={22} />
                  </div>
                  <h3 className="font-semibold text-text-primary">{cat.name}</h3>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {stats.count} transaction{stats.count !== 1 ? "s" : ""} this month
                  </span>
                </div>
                <p className="mt-1 font-[Outfit] text-xl font-bold text-primary">
                  {formatCurrency(stats.amount)}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Category Modal */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setNewName("");
        }}
        title="Add Category"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Travel, Rent, Gifts..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAddOpen(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
      >
        {deleteTarget?.txnCount > 0 ? (
          <p className="text-sm text-text-muted mb-6">
            <span className="font-semibold text-secondary">{deleteTarget.name}</span> has{" "}
            <span className="font-semibold text-danger">{deleteTarget.txnCount}</span>{" "}
            transaction{deleteTarget.txnCount !== 1 ? "s" : ""} this month. Delete them first
            before removing this category.
          </p>
        ) : (
          <p className="text-sm text-text-muted mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-text-primary">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 size={16} className="animate-spin" />}
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
