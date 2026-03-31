import { useState, useRef, useEffect } from "react";
import { Lock, LogOut } from "lucide-react";

export default function ProfileDropdown({ profile, onLogout, onChangePassword }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const firstName = profile?.fullName?.split(" ")[0] || "User";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 cursor-pointer"
      >
        <span className="text-sm font-medium text-text-primary hidden sm:block">
          {firstName}
        </span>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {profile?.avatarInitials || "??"}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-surface shadow-xl z-50 animate-fadeIn"
        >
          {/* Header */}
          <div className="flex flex-col items-center px-5 pt-5 pb-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white font-bold text-lg"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {profile?.avatarInitials || "??"}
            </div>
            <p
              className="mt-3 text-lg font-semibold text-text-primary"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {profile?.fullName || "User"}
            </p>
            <p className="text-sm text-text-muted">{profile?.email || ""}</p>
          </div>

          <div className="border-t border-border" />

          {/* Menu items */}
          <div className="py-1.5">
            <button
              onClick={() => {
                setOpen(false);
                onChangePassword();
              }}
              className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-text-muted hover:bg-background hover:text-text-primary transition-colors cursor-pointer"
            >
              <Lock size={16} />
              Change Password
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-5 py-2.5 text-sm text-text-muted hover:bg-danger/10 hover:text-danger transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
