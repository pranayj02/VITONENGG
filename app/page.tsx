"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f3f8] dark:bg-gray-950 flex items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute top-4 right-4 p-2 rounded-xl text-viton-navy-muted dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 transition-all"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-viton-red dark:bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-red-500/20 dark:shadow-orange-500/20">
            <span className="text-white text-3xl font-bold">V</span>
          </div>
          <h1 className="text-viton-navy dark:text-white text-3xl font-bold tracking-tight">VITON ENGINEERS</h1>
          <p className="text-viton-text-faint dark:text-gray-500 mt-2 text-sm">Procurement &amp; Invoice Portal</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-[#dde1ea] dark:border-gray-800 shadow-lg dark:shadow-2xl">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-viton-text-muted dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="you@vitonengg.com"
                required
              />
            </div>

            <div>
              <label className="block text-viton-text-muted dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-viton-red hover:bg-viton-red-hover active:bg-viton-red-active dark:bg-orange-500 dark:hover:bg-orange-600 dark:active:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        </div>

        <p className="text-center text-[#8892a8] dark:text-gray-700 text-xs mt-6">
          VITONENGG · Internal Use Only
        </p>
      </div>
    </div>
  );
}
