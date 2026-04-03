"use client";

import { useEffect, useState } from "react";
import { X, MessageCircle, Check } from "lucide-react";
import { API_URL } from "@/lib/config";

interface FeedbackWidgetProps {
  analysisId: string;
  token: string | null;
}

export function FeedbackWidget({ analysisId, token }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<{ rating: number; comment: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch existing feedback on mount
  useEffect(() => {
    if (!token || !analysisId) return;
    fetch(`${API_URL}/api/feedback/${analysisId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setExistingFeedback({ rating: data.rating, comment: data.comment ?? "" });
          setRating(data.rating);
          setComment(data.comment ?? "");
          setSubmitted(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [analysisId, token]);

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
        setExistingFeedback({ rating, comment });
        setSubmitted(true);
        setTimeout(() => setOpen(false), 3000);
      }
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyRated = submitted || !!existingFeedback;

  if (!loaded) return null;

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Expanded panel */}
        {open && (
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-80 max-w-[calc(100vw-3rem)]"
            style={{
              animation: "slideUpFade 0.2s ease-out",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">
                {alreadyRated ? "Seu feedback" : "Avalie sua experiência"}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Thank you message after submit */}
              {submitted && !existingFeedback && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-medium text-gray-800">Obrigado pelo feedback!</p>
                  <p className="text-xs text-gray-400">Isso nos ajuda a melhorar o produto.</p>
                </div>
              )}

              {/* Rating buttons */}
              {(!submitted || existingFeedback) && (
                <div>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => !alreadyRated && setRating(i)}
                        disabled={alreadyRated}
                        className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                          rating === i
                            ? "bg-indigo-600 text-white shadow"
                            : alreadyRated
                            ? "bg-gray-100 text-gray-400 cursor-default"
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
              )}

              {/* Comment */}
              {(!submitted || existingFeedback) && (
                <div className="relative">
                  <textarea
                    value={comment}
                    onChange={(e) => !alreadyRated && setComment(e.target.value.slice(0, 500))}
                    readOnly={alreadyRated}
                    placeholder="Conte-nos o que achou, sugestões, críticas... (opcional)"
                    rows={3}
                    className={`w-full text-xs rounded-xl border border-gray-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-300 ${
                      alreadyRated ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white text-gray-700"
                    }`}
                  />
                  {!alreadyRated && (
                    <span className="absolute bottom-2 right-3 text-[10px] text-gray-300">
                      {comment.length}/500
                    </span>
                  )}
                </div>
              )}

              {/* Submit button */}
              {!alreadyRated && (
                <button
                  onClick={handleSubmit}
                  disabled={rating === null || submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
                >
                  {submitting ? "Enviando..." : "Enviar avaliação"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 ${
            alreadyRated ? "bg-emerald-600" : "bg-indigo-600"
          } text-white`}
        >
          {alreadyRated ? (
            <Check className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          {/* Badge: not yet rated */}
          {!alreadyRated && !open && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
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
