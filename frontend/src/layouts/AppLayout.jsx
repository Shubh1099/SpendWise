import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, Tags, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import { getProfile } from "../api/userApi";
import ProfileDropdown from "../components/ProfileDropdown";
import ChangePasswordModal from "../components/ChangePasswordModal";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/categories", label: "Categories", icon: Tags },
];

const pageTitles = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/categories": "Categories",
};

export default function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Expense Tracker";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/20">
              <span className="text-base font-extrabold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>$</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight font-[Outfit] bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                Spendwise
              </span>
              <span className="text-[10px] font-medium text-text-muted tracking-widest uppercase">
                tracker
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-text-muted hover:text-text-primary md:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {/* eslint-disable-next-line no-unused-vars */}
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-background hover:text-text-primary"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-text-muted hover:text-text-primary md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <ProfileDropdown
            profile={profile}
            onLogout={logout}
            onChangePassword={() => setChangePasswordOpen(true)}
          />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
          <div key={location.pathname} className="animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        email={profile?.email}
        onLogout={logout}
      />
    </div>
  );
}
