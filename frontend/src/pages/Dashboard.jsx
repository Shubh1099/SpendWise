import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChevronLeft, ChevronRight, Wallet, Receipt, Tag, Inbox } from "lucide-react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { getMonthlySummary, getTransactions } from "../api/transactionApi";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { CategoryIcon } from "../utils/categoryIcons";
import { useToast } from "../hooks/useToast";
import dayjs from "dayjs";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#6366F1", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <div className="h-4 w-24 rounded bg-border mb-3" />
      <div className="h-8 w-32 rounded bg-border" />
    </Card>
  );
}

function SkeletonChart() {
  return (
    <Card className="animate-pulse">
      <div className="h-4 w-32 rounded bg-border mb-6" />
      <div className="h-64 rounded bg-border/50" />
    </Card>
  );
}

function CustomBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-text-primary">{d.categoryName}</p>
      <p className="text-sm text-primary">{formatCurrency(d.amount)}</p>
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-text-primary">{d.categoryName}</p>
      <p className="text-sm text-primary">{d.percent}%</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const now = dayjs();
  const [month, setMonth] = useState(now.month() + 1);
  const [year, setYear] = useState(now.year());
  const [summary, setSummary] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [summaryRes, txnRes] = await Promise.all([
          getMonthlySummary({ month, year }),
          getTransactions({ month, year }),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        const sorted = (txnRes.data || []).sort(
          (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
        );
        setRecentTxns(sorted.slice(0, 5));
      } catch {
        if (!cancelled) {
          setSummary(null);
          setRecentTxns([]);
          toast.error("Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const breakdown = summary?.categoryBreakdown || [];
  const totalAmount = Number(summary?.totalAmount) || 0;
  const transactionCount = summary?.transactionCount || 0;

  const topCategory = breakdown.length
    ? breakdown.reduce((max, c) => (Number(c.amount) > Number(max.amount) ? c : max), breakdown[0])
    : null;

  const pieData = breakdown.map((c) => ({
    ...c,
    amount: Number(c.amount),
    percent: totalAmount > 0 ? ((Number(c.amount) / totalAmount) * 100).toFixed(1) : 0,
  }));

  const barData = breakdown
    .map((c) => ({ ...c, amount: Number(c.amount) }))
    .sort((a, b) => b.amount - a.amount);

  const isEmpty = !loading && transactionCount === 0;

  return (
    <div className="space-y-6">
      {/* Month/Year Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-border bg-surface p-2 text-text-muted transition-colors hover:bg-background hover:text-text-primary"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[130px] sm:min-w-[160px] text-center font-semibold text-text-primary">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-border bg-surface p-2 text-text-muted transition-colors hover:bg-background hover:text-text-primary"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            <SkeletonChart className="col-span-3" />
            <SkeletonChart className="col-span-2" />
          </div>
        </>
      )}

      {/* Empty State */}
      {isEmpty && (
        <Card className="flex flex-col items-center justify-center py-20">
          <Inbox size={56} className="text-text-muted/40 mb-4" />
          <p className="text-lg font-semibold text-text-muted">No expenses logged this month</p>
          <p className="mt-1 text-sm text-text-muted/70">
            Start tracking by adding a transaction.
          </p>
        </Card>
      )}

      {/* Stat Cards */}
      {!loading && !isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card>
              <div className="flex items-center gap-3 text-text-muted mb-2">
                <Wallet size={18} />
                <span className="text-sm font-medium">Total Spent</span>
              </div>
              <p className="font-[Outfit] text-3xl font-bold text-primary">
                {formatCurrency(totalAmount)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-3 text-text-muted mb-2">
                <Receipt size={18} />
                <span className="text-sm font-medium">Transactions</span>
              </div>
              <p className="font-[Outfit] text-3xl font-bold text-text-primary">
                {transactionCount}
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-3 text-text-muted mb-2">
                <Tag size={18} />
                <span className="text-sm font-medium">Top Category</span>
              </div>
              <p className="font-[Outfit] text-2xl font-bold text-text-primary flex items-center gap-2">
                {topCategory ? (
                  <>
                    <CategoryIcon name={topCategory.categoryIcon} size={22} />
                    {topCategory.categoryName}
                  </>
                ) : "—"}
              </p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Bar Chart */}
            <Card className="lg:col-span-3">
              <h2 className="mb-6 text-sm font-semibold text-text-muted">Spending by Category</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${v}`}
                    tick={{ fill: "#94A3B8", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoryName"
                    tick={{ fill: "#F1F5F9", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={22}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie Chart */}
            <Card className="lg:col-span-2">
              <h2 className="mb-6 text-sm font-semibold text-text-muted">Category Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="amount"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
                {pieData.map((c, i) => (
                  <div key={c.categoryName} className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {c.categoryName}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-muted">Recent Transactions</h2>
              <button
                onClick={() => navigate("/transactions")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentTxns.map((txn) => (
                <div
                  key={txn.id}
                  onClick={() => navigate("/transactions")}
                  className="flex cursor-pointer items-center gap-3 sm:gap-4 py-3 transition-colors hover:bg-background/50 -mx-6 px-6"
                >
                  <span className="hidden sm:inline text-sm text-text-muted w-24 shrink-0">
                    {formatDate(txn.transactionDate)}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm text-text-primary">
                    {txn.description}
                  </span>
                  <span className="hidden sm:inline">
                    <Badge variant="secondary">
                      <CategoryIcon name={txn.categoryIcon} size={14} className="shrink-0" />
                      {txn.categoryName}
                    </Badge>
                  </span>
                  <span className="shrink-0 text-right font-[Outfit] text-sm font-semibold text-primary">
                    {formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
