"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("analysis_id");
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!analysisId) return;

    const token = localStorage.getItem("ats_token");
    if (!token) {
      window.location.href = "/dashboard";
      return;
    }

    async function checkAndRedirect() {
      console.log(">>> 1. Verificando status do pagamento...");
      const statusRes = await fetch(
        `${API_URL}/api/payment/status/${analysisId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(">>> 2. Status response:", statusRes.status);
      if (!statusRes.ok) { console.log(">>> Status falhou"); return; }
      const { paid } = await statusRes.json();
      console.log(">>> 3. Paid:", paid);
      if (!paid) { console.log(">>> Não pago ainda"); return; }

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      console.log(">>> 4. Buscando resultado completo...");
      const resultRes = await fetch(
        `${API_URL}/api/analysis/${analysisId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(">>> 5. Result response:", resultRes.status);
      if (!resultRes.ok) { console.log(">>> Result falhou, redirecionando"); window.location.href = "/dashboard"; return; }
      const resultData = await resultRes.json();
      console.log(">>> 6. Result data keys:", Object.keys(resultData));
      localStorage.setItem("ats_pending_result", JSON.stringify(resultData));
      console.log(">>> 7. Salvo no localStorage, redirecionando...");
      window.location.href = "/dashboard";
    }

    intervalRef.current = setInterval(checkAndRedirect, 3000);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimedOut(true);
    }, 60000);

    // Run immediately on first render
    checkAndRedirect();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [analysisId]);

  if (timedOut) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white gap-6 px-4">
        <span className="text-5xl">⏳</span>
        <h1 className="text-xl font-bold text-gray-900 text-center">
          Pagamento em processamento
        </h1>
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Seu pagamento está sendo processado. Tente novamente em alguns minutos.
        </p>
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-2.5 px-6 transition-colors text-sm"
        >
          Voltar ao início
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white gap-6">
      <svg
        className="animate-spin h-12 w-12 text-indigo-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-gray-600 text-lg font-medium">Confirmando pagamento...</p>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
