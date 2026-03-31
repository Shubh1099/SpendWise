import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/20">
              <span className="text-xl font-extrabold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>$</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-text-muted">Sign in to your Spendwise account</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 outline-none transition-colors focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background transition-all duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:text-emerald-400 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
