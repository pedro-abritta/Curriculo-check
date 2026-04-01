"use client";

export default function PaymentFailure() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white gap-6 px-4">
      <span className="text-5xl">❌</span>
      <h1 className="text-xl font-bold text-gray-900 text-center">
        Pagamento não realizado
      </h1>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        Não foi possível concluir o pagamento. Nenhuma cobrança foi efetuada.
      </p>
      <button
        onClick={() => window.history.back()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-2.5 px-6 transition-colors text-sm"
      >
        Tentar novamente
      </button>
    </main>
  );
}
