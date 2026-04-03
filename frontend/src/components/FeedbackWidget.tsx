"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { API_URL } from "@/lib/config";

interface FeedbackWidgetProps {
  analysisId: string;
  token: string | null;
}

type SavedFeedback = { rating: number; comment: string };

export function FeedbackWidget({ analysisId, token }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  // Last saved feedback fetched from server (or just submitted)
  const [savedFeedback, setSavedFeedback] = useState<SavedFeedback | null>(null);
  // Current form state
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [editingNew, setEditingNew] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pulsing, setPulsing] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch most recent feedback on mount
  useEffect(() => {
    if (!token || !analysisId) return;
    fetch(`${API_URL}/api/feedback/${analysisId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSavedFeedback({ rating: data.rating, comment: data.comment ?? "" });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [analysisId, token]);

  // Show tooltip and stop pulsing after 5s (only if not already rated)
  useEffect(() => {
    if (!loaded) return;
    if (savedFeedback) return;

    setShowTooltip(true);
    const timer = setTimeout(() => setPulsing(false), 5000);
    return () => clearTimeout(timer);
  }, [loaded, savedFeedback]);

  function openNewForm() {
    setRating(null);
    setComment("");
    setJustSubmitted(false);
    setEditingNew(true);
  }

  async function handleSubmit() {
    if (rating === null || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysis_id: analysisId, rating, comment }),
      });
      if (res.ok) {
        setSavedFeedback({ rating, comment });
        setJustSubmitted(true);
        setEditingNew(false);
        setShowTooltip(false);
        setTimeout(() => {
          setJustSubmitted(false);
          setOpen(false);
        }, 3000);
      }
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyRated = !!savedFeedback;
  // Show the "viewing saved" mode: have a saved feedback AND not currently editing a new one
  const viewingSaved = alreadyRated && !editingNew && !justSubmitted;

  if (!loaded) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Expanded panel */}
        {open && (
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-80 max-w-[calc(100vw-3rem)]"
            style={{ animation: "slideUpFade 0.2s ease-out" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">
                {viewingSaved ? "Seu feedback" : "Avalie sua experiência"}
              </p>
              <button
                onClick={() => { setOpen(false); setEditingNew(false); setJustSubmitted(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">

              {/* Thank you after submit */}
              {justSubmitted && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-medium text-gray-800">Obrigado pelo feedback!</p>
                  <p className="text-xs text-gray-400">Isso nos ajuda a melhorar o produto.</p>
                </div>
              )}

              {/* Viewing saved feedback (readonly) */}
              {viewingSaved && savedFeedback && (
                <>
                  <div>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          disabled
                          className={`w-7 h-7 rounded-full text-xs font-semibold ${
                            savedFeedback.rating === i
                              ? "bg-indigo-600 text-white shadow"
                              : "bg-gray-100 text-gray-400 cursor-default"
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-gray-400">0 = Péssimo</span>
                      <span className="text-xs text-gray-400">10 = Excelente</span>
                    </div>
                  </div>

                  {savedFeedback.comment && (
                    <textarea
                      value={savedFeedback.comment}
                      readOnly
                      rows={3}
                      className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2.5 resize-none bg-gray-50 text-gray-500 cursor-default"
                    />
                  )}

                  <button
                    onClick={openNewForm}
                    className="text-sm text-indigo-600 underline cursor-pointer w-full text-center"
                  >
                    Enviar novo feedback
                  </button>
                </>
              )}

              {/* New feedback form (first time or editingNew) */}
              {!justSubmitted && !viewingSaved && (
                <>
                  <div>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setRating(i)}
                          className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                            rating === i
                              ? "bg-indigo-600 text-white shadow"
                              : "bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700"
                          }`}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-gray-400">0 = Péssimo</span>
                      <span className="text-xs text-gray-400">10 = Excelente</span>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 500))}
                      placeholder="Conte-nos o que achou, sugestões, críticas... (opcional)"
                      rows={3}
                      className="w-full text-xs rounded-xl border border-gray-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-300 bg-white text-gray-700"
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-gray-300">
                      {comment.length}/500
                    </span>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={rating === null || submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
                  >
                    {submitting ? "Enviando..." : "Enviar avaliação"}
                  </button>
                </>
              )}

            </div>
          </div>
        )}

        {/* Tooltip balloon */}
        {showTooltip && !open && !alreadyRated && (
          <div
            className="relative bg-white rounded-xl shadow-md border border-gray-200 px-4 py-3 max-w-[220px]"
            style={{ animation: "slideUpFade 0.25s ease-out" }}
          >
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="text-sm font-medium text-gray-700 pr-3">
              Seu feedback é muito importante!
            </p>
            <span
              className="absolute -bottom-2 right-6 w-0 h-0"
              style={{
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid white",
                filter: "drop-shadow(0 1px 0 #e5e7eb)",
              }}
            />
          </div>
        )}

        {/* Floating button */}
        <button
          onClick={() => {
            setShowTooltip(false);
            setEditingNew(false);
            setJustSubmitted(false);
            setOpen((v) => !v);
          }}
          className={`flex items-center gap-2 rounded-full px-5 py-3 shadow-lg font-semibold text-white text-sm transition-transform hover:scale-105 ${
            alreadyRated
              ? "bg-emerald-600 hover:bg-emerald-700"
              : pulsing
              ? "bg-indigo-600 animate-pulse"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {alreadyRated ? (
            <>
              <Check className="h-4 w-4" />
              Avaliado
            </>
          ) : (
            <>
              <span>💬</span>
              Avaliar
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
