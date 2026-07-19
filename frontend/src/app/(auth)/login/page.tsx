"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Eye, EyeOff, TrendingUp, BarChart3, Lock } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Selamat datang kembali!");
    } catch (err: any) {
      toast.error(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/50 to-transparent" />
        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-primary/20 border border-primary/30">
              <BarChart3 className="w-16 h-16 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-3">
              IDX Financial Analyzer
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Analisis laporan keuangan perusahaan publik BEI secara otomatis.
              Upload PDF, AI bekerja, data tersimpan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: "📤", title: "Upload PDF", desc: "Drag & drop laporan keuangan" },
              { icon: "🤖", title: "AI Ekstraksi", desc: "Gemini AI baca data otomatis" },
              { icon: "📊", title: "Chart YOY", desc: "Tren data tahun per tahun" },
              { icon: "🔢", title: "Rasio Otomatis", desc: "GPM, ROE, DER, PBV, PER" },
            ].map((f) => (
              <div key={f.title} className="glass rounded-xl p-4">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-semibold text-sm mt-2">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 shadow-2xl">
            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-6">
              <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                <BarChart3 className="w-10 h-10 text-primary" />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Masuk</h2>
              <p className="text-muted-foreground mt-1">
                Masuk ke akun IDX Financial Anda
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
