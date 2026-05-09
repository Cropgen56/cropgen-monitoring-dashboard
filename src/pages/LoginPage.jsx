import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Mail, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const nav = useNavigate();
  const { isAuthenticated, login, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && isAuthenticated) {
      nav("/dashboard", { replace: true });
    }
  }, [ready, isAuthenticated, nav]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e12] text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0e12]">
      <div
        className="hidden w-1/2 bg-cover bg-center lg:block"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(10,14,18,0.85) 0%, rgba(26,49,35,0.5) 100%), url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80)",
        }}
      />
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cg-accent/15 text-cg-accent">
              <Leaf className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CropGen</h1>
              <p className="text-[11px] text-gray-500">AI Smart Agriculture Administration System</p>
            </div>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (login(email, password)) {
                nav("/dashboard", { replace: true });
              } else {
                setError("Invalid email or password.");
              }
            }}
          >
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#111820] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cg-accent/50"
                  placeholder="admin@cropgenapp.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#111820] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cg-accent/50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-cg-accent py-3 text-sm font-bold text-[#0c2214] shadow-lg hover:brightness-110"
            >
              Login
            </button>
          </form>
          <p className="mt-6 text-center text-[10px] text-gray-600">
            Prototype sign-in — session stored in this browser only.
          </p>
        </div>
      </div>
    </div>
  );
}
