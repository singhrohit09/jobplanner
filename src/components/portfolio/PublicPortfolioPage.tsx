import React, { useEffect, useState } from "react";
import { PublicPortfolioData } from "../../types";
import { getPublicPortfolio } from "../../lib/firebase";
import { PortfolioTemplates } from "./PortfolioTemplates";
import { Sparkles, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

interface PublicPortfolioPageProps {
  publicId: string;
  onExitToApp?: () => void;
}

export const PublicPortfolioPage: React.FC<PublicPortfolioPageProps> = ({
  publicId,
  onExitToApp,
}) => {
  const [data, setData] = useState<PublicPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        setError(null);
        const fetched = await getPublicPortfolio(publicId);
        if (!fetched) {
          setError("This portfolio could not be found or has been made private by the candidate.");
        } else {
          setData(fetched);
        }
      } catch (err: any) {
        setError("Error loading portfolio. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (publicId) {
      loadPortfolio();
    }
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-[#C85A32] animate-spin mb-3" />
        <h2 className="text-base font-bold text-stone-800 font-editorial">
          Loading Candidate Portfolio...
        </h2>
        <p className="text-xs text-stone-500 mt-1">Verifying public showcase credentials</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 font-editorial">
          Portfolio Unavailable
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mt-1 mb-6">
          {error || "The portfolio link is invalid or has been set to private."}
        </p>
        {onExitToApp && (
          <button
            onClick={onExitToApp}
            className="px-5 py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to JobPlanner Home</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* Subtle Top Navigation Bar */}
      <nav className="bg-[#FFFFFF] border-b border-[#E7E2DA] px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#C85A32] text-white flex items-center justify-center text-xs font-bold font-editorial">
            JP
          </div>
          <span className="text-xs font-bold text-stone-800 tracking-tight">
            JobPlanner • Candidate Portfolio
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onExitToApp && (
            <button
              onClick={onExitToApp}
              className="text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
            >
              Open JobPlanner
            </button>
          )}
          <a
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Build Your Portfolio</span>
          </a>
        </div>
      </nav>

      {/* Render Selected Template */}
      <main className="flex-1">
        <PortfolioTemplates data={data} />
      </main>
    </div>
  );
};
