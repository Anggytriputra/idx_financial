"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        redirect("/dashboard");
      } else {
        redirect("/login");
      }
    }
  }, [user, isLoading]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    </div>
  );
}
