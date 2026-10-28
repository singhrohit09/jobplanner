import React, { useState } from "react";
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Share2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Sparkles,
  Layout,
  Palette,
} from "lucide-react";
import {
  PublicPortfolioData,
  PortfolioSettings,
  PortfolioTemplateType,
} from "../../types";
import { PortfolioTemplates } from "./PortfolioTemplates";
import { generateStandalonePortfolioHtml } from "../../lib/portfolioUtils";

interface PublicPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioData: PublicPortfolioData;
  settings: PortfolioSettings;
  onSaveSettings: (newSettings: PortfolioSettings) => Promise<void>;
  onPublishToggle: (isPublic: boolean) => Promise<void>;
}

export const PublicPortfolioModal: React.FC<PublicPortfolioModalProps> = ({
  isOpen,
  onClose,
  portfolioData,
  settings,
  onSaveSettings,
  onPublishToggle,
}) => {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<PortfolioTemplateType>(
    settings.template || "modern"
  );

  if (!isOpen) return null;

  // Build public shareable URL
  const publicShareUrl = `${window.location.origin}${window.location.pathname}?portfolio=${settings.slug || portfolioData.publicId}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTemplateChange = async (tmpl: PortfolioTemplateType) => {
    setActiveTemplate(tmpl);
    const updated = { ...settings, template: tmpl, updatedAt: new Date().toISOString() };
    await onSaveSettings(updated);
  };

  const handleTogglePublish = async () => {
    try {
      setIsUpdating(true);
      await onPublishToggle(!settings.isPublic);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadHtml = () => {
    const htmlString = generateStandalonePortfolioHtml(portfolioData);
    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(portfolioData.profile.fullName || "portfolio").toLowerCase().replace(/\s+/g, "_")}_portfolio.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const viewportClass =
    viewport === "mobile"
      ? "max-w-sm"
      : viewport === "tablet"
      ? "max-w-2xl"
      : "max-w-5xl";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex flex-col">
      {/* Control Header */}
      <div className="bg-[#FFFFFF] border-b border-[#E7E2DA] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FAF3EC] text-[#C85A32] flex items-center justify-center border border-[#F3DACF]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 font-editorial">
              Portfolio Live Preview & Publishing
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.isPublic ? "bg-emerald-500" : "bg-stone-300"
                }`}
              />
              <span className="text-[11px] text-stone-500 font-medium">
                {settings.isPublic ? "Published & Recruiter Accessible" : "Private Draft"}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Template & Viewport Selectors */}
        <div className="flex items-center gap-2">
          {/* Template picker */}
          <div className="flex items-center gap-1 bg-[#F5F2EB] p-1 rounded-xl">
            {(["modern", "minimal", "developer", "professional"] as PortfolioTemplateType[]).map(
              (tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => handleTemplateChange(tmpl)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                    activeTemplate === tmpl
                      ? "bg-white text-[#C85A32] shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {tmpl}
                </button>
              )
            )}
          </div>

          {/* Viewport picker */}
          <div className="hidden sm:flex items-center gap-1 bg-[#F5F2EB] p-1 rounded-xl">
            <button
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewport === "desktop" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500"
              }`}
              title="Desktop view"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewport === "tablet" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500"
              }`}
              title="Tablet view"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewport === "mobile" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500"
              }`}
              title="Mobile view"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHtml}
            className="px-3 py-1.5 rounded-xl border border-[#D9D3C8] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download offline HTML file"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Download HTML</span>
          </button>

          {settings.isPublic && (
            <button
              onClick={handleCopyUrl}
              className="px-3 py-1.5 rounded-xl border border-[#D9D3C8] text-xs font-semibold text-stone-700 hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy shareable link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </button>
          )}

          <button
            onClick={handleTogglePublish}
            disabled={isUpdating}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              settings.isPublic
                ? "bg-stone-800 hover:bg-stone-900 text-white"
                : "bg-[#C85A32] hover:bg-[#B24E2A] text-white"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{settings.isPublic ? "Unpublish" : "Publish Portfolio"}</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-900/40 flex justify-center items-start">
        <div
          className={`w-full ${viewportClass} transition-all duration-300 rounded-2xl shadow-2xl overflow-hidden border border-stone-300/40`}
        >
          <PortfolioTemplates data={portfolioData} templateOverride={activeTemplate} />
        </div>
      </div>
    </div>
  );
};
