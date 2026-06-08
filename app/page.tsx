"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen relative overflow-hidden bg-[#f4f6fb] dark:bg-[#090c11]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.10),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.10),transparent_58%)]" />
        <div className="absolute left-[-8%] top-[18%] h-72 w-72 rounded-full bg-white/50 blur-3xl dark:bg-orange-500/5" />
        <div className="absolute right-[-8%] bottom-[8%] h-80 w-80 rounded-full bg-red-100/70 blur-3xl dark:bg-red-500/5" />
        <div className="absolute inset-0 opacity-[0.36] [background-image:linear-gradient(rgba(136,146,168,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(136,146,168,0.08)_1px,transparent_1px)] [background-size:40px_40px] dark:opacity-[0.14]" />
      </div>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-viton-navy backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 sm:right-6 sm:top-6"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative z-10 min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/72 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1117]/88 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:grid-cols-[1.08fr_0.92fr]">
            <section className="relative hidden min-h-[720px] overflow-hidden px-10 py-12 lg:flex lg:items-center lg:justify-center xl:px-14">
              <div className="flex w-full max-w-2xl flex-col items-center text-center">
                <img src="/Logo.JPG" alt="Viton Engineers" className="h-28 w-28 object-contain xl:h-36 xl:w-36" />

                <div className="mt-12">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.26em] text-[#8892a8] dark:text-gray-500">
                    Procurement & Invoice Portal
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-viton-navy dark:text-white xl:text-[3.15rem] xl:leading-[1.02]">Viton Engineers Pvt. Ltd.</h1>
                  <h2 className="mt-6 text-2xl font-medium tracking-tight text-viton-navy/90 dark:text-white/85 xl:text-[2rem] xl:leading-[1.15]">
                    Precision flow control starts here.
                  </h2>
                </div>
              </div>
            </section>

            <section className="relative flex min-h-[100svh] items-center justify-center px-5 py-8 sm:px-8 lg:min-h-[720px] lg:px-10 xl:px-14">
              <div className="w-full max-w-md">
                <div className="mb-8 flex items-center gap-4 lg:hidden">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-white">
                    <img src="/Logo.JPG" alt="Viton Engineers" className="h-10 w-10 object-contain" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-viton-red dark:text-orange-400">Vitonengg</p>
                    <h1 className="text-lg font-semibold tracking-tight text-viton-navy dark:text-white">Viton Engineers</h1>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#dde1ea] bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#11161d]/92 dark:shadow-[0_20px_60px_rgba(0,0,0,0.38)] sm:p-8">
                  <div className="mb-8">
                    <h2 className="text-3xl font-semibold tracking-tight text-viton-navy dark:text-white">Sign in</h2>
                  </div>

                  {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d6885] dark:text-gray-400">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-14 w-full rounded-2xl border border-[#d8deea] bg-[#f7f9fc] px-4 text-sm text-viton-navy outline-none transition-all placeholder:text-[#96a1b8] focus:border-viton-red focus:bg-white focus:ring-4 focus:ring-red-500/10 dark:border-white/10 dark:bg-[#0f141b] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-orange-500 dark:focus:bg-[#121923] dark:focus:ring-orange-500/10"
                        placeholder="you@vitonengg.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5d6885] dark:text-gray-400">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 w-full rounded-2xl border border-[#d8deea] bg-[#f7f9fc] px-4 text-sm text-viton-navy outline-none transition-all placeholder:text-[#96a1b8] focus:border-viton-red focus:bg-white focus:ring-4 focus:ring-red-500/10 dark:border-white/10 dark:bg-[#0f141b] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-orange-500 dark:focus:bg-[#121923] dark:focus:ring-orange-500/10"
                        placeholder="••••••••••"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-viton-red px-5 text-sm font-semibold text-white transition-all hover:bg-viton-red-hover active:bg-viton-red-active disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600 dark:active:bg-orange-700"
                    >
                      <span>{loading ? "Signing in..." : "Sign In"}</span>
                      {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-xs text-[#8892a8] dark:text-gray-500">
                    VITONENGG · Internal Use Only
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
