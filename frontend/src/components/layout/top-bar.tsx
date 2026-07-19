"use client";

import { useAuth } from "@/contexts/auth-context";
import { Bell, Menu, TrendingUp, Sun, Moon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export function TopBar() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Check local storage or document class on mount
    const savedTheme = localStorage.getItem("theme");
    const isLight = savedTheme === "light" || document.documentElement.classList.contains("light");
    if (isLight) {
      setTheme("light");
      document.documentElement.classList.add("light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  const now = new Date();
  const greeting = now.getHours() < 12
    ? "Selamat Pagi"
    : now.getHours() < 18
      ? "Selamat Siang"
      : "Selamat Malam";

  return (
    <header className="glass border-b border-border/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm font-medium text-foreground">
            {greeting},{" "}
            <span className="text-primary font-semibold">
              {user?.fullName?.split(" ")[0] || "Investor"}
            </span>
            ! 👋
          </h2>
          <p className="text-xs text-muted-foreground">
            {now.toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium text-green-500">BEI Live</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>

        {/* Topbar Logout Button */}
        <button
          onClick={logout}
          className="p-2.5 rounded-xl border border-border bg-destructive/10 text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-all flex items-center gap-2"
          title="Keluar"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-xs font-medium hidden md:inline text-destructive">Keluar</span>
        </button>
      </div>
    </header>
  );
}

