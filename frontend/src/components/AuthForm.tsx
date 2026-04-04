"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/lib/config";

const API = `${API_URL}/api/auth`;

interface AuthFormProps {
  onAuth: (token: string) => void;
}

export function AuthForm({ onAuth }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deactivated, setDeactivated] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): string {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Digite um email válido.";
    if (password.length < 8)
      return "A senha deve ter no mínimo 8 caracteres.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDeactivated(false);
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (res.status === 403) {
        setDeactivated(true);
        return;
      }
      if (!res.ok) {
        setError(data.detail || "Erro ao autenticar. Tente novamente.");
        return;
      }
      onAuth(data.access_token);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">ATS Analyzer</h1>
          <p className="mt-2 text-gray-500 text-lg">Análise inteligente de currículos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {mode === "login" ? "Entrar na conta" : "Criar conta"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Acesse sua conta para analisar currículos"
                : "Crie sua conta gratuitamente"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={loading}
                />
              </div>

              {deactivated && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-800">
                    Conta desativada. Entre em contato com o suporte.
                  </p>
                </div>
              )}

              {error && !deactivated && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={loading}
              >
                {loading
                  ? "Aguarde..."
                  : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          {mode === "login" ? (
            <>
              Não tem conta?{" "}
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="text-indigo-600 font-medium hover:underline"
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-indigo-600 font-medium hover:underline"
              >
                Fazer login
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
