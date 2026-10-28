import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Calculator,
  Scale,
  TrendingUp,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Coins,
  ShieldCheck,
  ChevronRight,
  Info,
  ArrowRight,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Award,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  JobOffer,
  JobApplication,
  UserProfile,
  VestingScheduleType,
  CostOfLivingTier,
  NegotiationGoalType,
  NegotiationToneType,
  OfferNegotiationResult,
} from "../types";
import {
  calculateOfferBreakdown,
  formatCompensationAmount,
  parseSalaryStringToNumeric,
  generateHeuristicNegotiationScript,
  SAMPLE_DEFAULT_OFFERS,
  COL_FACTORS,
  getVestingSchedulePcts,
} from "../lib/offerCalculator";
import { ROLE_BENCHMARKS } from "../lib/defaultData";

interface OfferCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications?: JobApplication[];
  profile?: UserProfile;
  careerReadinessScore?: number | null;
  initialSelectedApp?: JobApplication | null;
}

export const OfferCalculatorModal: React.FC<OfferCalculatorModalProps> = ({
  isOpen,
  onClose,
  applications = [],
  profile,
  careerReadinessScore,
  initialSelectedApp,
}) => {
  // Active internal tab
  const [activeTab, setActiveTab] = useState<"compare" | "vesting" | "negotiate">("compare");

  // Offers state with LocalStorage persistence
  const [offers, setOffers] = useState<JobOffer[]>(() => {
    try {
      const saved = localStorage.getItem("jobplanner_offers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Notice loading saved offers:", e);
    }
    return SAMPLE_DEFAULT_OFFERS;
  });

  // Persist offers to local storage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem("jobplanner_offers", JSON.stringify(offers));
    } catch (e) {
      console.warn("Notice persisting offers:", e);
    }
  }, [offers]);

  // Selected offer for detailed vesting / negotiation
  const [selectedOfferId, setSelectedOfferId] = useState<string>(() => {
    return offers[0]?.id || "";
  });

  // Modal / Form state for adding or editing an offer
  const [isOfferFormOpen, setIsOfferFormOpen] = useState<boolean>(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Form Fields
  const [formCompany, setFormCompany] = useState("");
  const [formRole, setFormRole] = useState(profile?.target_role || "Software Engineer");
  const [formLocation, setFormLocation] = useState("Bengaluru");
  const [formWorkMode, setFormWorkMode] = useState<"Remote" | "Hybrid" | "Onsite">("Hybrid");
  const [formCurrency, setFormCurrency] = useState("₹");
  const [formBaseSalary, setFormBaseSalary] = useState(800000);
  const [formSigningBonus, setFormSigningBonus] = useState(50000);
  const [formBonusPercent, setFormBonusPercent] = useState(10);
  const [formEquity, setFormEquity] = useState(300000);
  const [formVesting, setFormVesting] = useState<VestingScheduleType>(
    "Standard 4-Year (25%/yr, 1-yr cliff)"
  );
  const [formBenefits, setFormBenefits] = useState(60000);
  const [formColTier, setFormColTier] = useState<CostOfLivingTier>("Metro Tier 1 (High CoL)");
  const [formDeadline, setFormDeadline] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // AI Negotiation State
  const [negotiationGoal, setNegotiationGoal] = useState<NegotiationGoalType>("competing_offer");
  const [negotiationTone, setNegotiationTone] = useState<NegotiationToneType>("diplomatic_enthusiastic");
  const [targetBaseInput, setTargetBaseInput] = useState<string>("");
  const [additionalNotesInput, setAdditionalNotesInput] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [negotiationResult, setNegotiationResult] = useState<OfferNegotiationResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // If opened with an initial selected application, prompt to import
  useEffect(() => {
    if (initialSelectedApp && isOpen) {
      const existingOffer = offers.find(
        (o) => o.applicationId === initialSelectedApp.applicationId
      );
      if (existingOffer) {
        setSelectedOfferId(existingOffer.id);
      } else {
        // Pre-fill form from application
        const parsed = parseSalaryStringToNumeric(initialSelectedApp.salary);
        setFormCompany(initialSelectedApp.company || "");
        setFormRole(initialSelectedApp.jobTitle || profile?.target_role || "");
        setFormLocation(initialSelectedApp.location || "Bengaluru");
        setFormWorkMode(initialSelectedApp.workMode || "Hybrid");
        setFormCurrency(parsed.currency);
        setFormBaseSalary(parsed.base);
        setFormSigningBonus(50000);
        setFormBonusPercent(10);
        setFormEquity(250000);
        setFormBenefits(60000);
        setEditingOfferId(null);
        setIsOfferFormOpen(true);
      }
    }
  }, [initialSelectedApp, isOpen]);

  // Role benchmark string
  const targetRole = profile?.target_role || "Full Stack Developer";
  const benchmarkRange = ROLE_BENCHMARKS[targetRole]?.avgSalaryRange || "₹5.5 - ₹11 LPA";

  // Calculations for all offers
  const calculatedOffers = useMemo(() => {
    return offers.map((offer) => calculateOfferBreakdown(offer, benchmarkRange));
  }, [offers, benchmarkRange]);

  // Currently selected offer calculation
  const currentOfferCalculation = useMemo(() => {
    const found = calculatedOffers.find((c) => c.offer.id === selectedOfferId);
    return found || calculatedOffers[0] || null;
  }, [calculatedOffers, selectedOfferId]);

  // Best offer highlights
  const bestOffersSummary = useMemo(() => {
    if (calculatedOffers.length === 0) return null;
    const highestCash = [...calculatedOffers].sort((a, b) => b.year1Cash - a.year1Cash)[0];
    const highestTotal = [...calculatedOffers].sort(
      (a, b) => b.year1TotalComp - a.year1TotalComp
    )[0];
    const highestColAdjusted = [...calculatedOffers].sort(
      (a, b) => b.colAdjustedAnnualComp - a.colAdjustedAnnualComp
    )[0];
    return { highestCash, highestTotal, highestColAdjusted };
  }, [calculatedOffers]);

  // Open Form to Add New Offer
  const handleOpenAddForm = () => {
    setEditingOfferId(null);
    setFormCompany("");
    setFormRole(profile?.target_role || "Software Engineer");
    setFormLocation("Bengaluru");
    setFormWorkMode("Hybrid");
    setFormCurrency("₹");
    setFormBaseSalary(850000);
    setFormSigningBonus(50000);
    setFormBonusPercent(10);
    setFormEquity(400000);
    setFormVesting("Standard 4-Year (25%/yr, 1-yr cliff)");
    setFormBenefits(70000);
    setFormColTier("Metro Tier 1 (High CoL)");
    setFormDeadline("");
    setFormNotes("");
    setIsOfferFormOpen(true);
  };

  // Open Form to Edit an Offer
  const handleOpenEditForm = (offer: JobOffer) => {
    setEditingOfferId(offer.id);
    setFormCompany(offer.company);
    setFormRole(offer.roleTitle);
    setFormLocation(offer.location);
    setFormWorkMode(offer.workMode);
    setFormCurrency(offer.currency);
    setFormBaseSalary(offer.baseSalary);
    setFormSigningBonus(offer.signingBonus);
    setFormBonusPercent(offer.annualBonusPercent);
    setFormEquity(offer.equityTotalValue);
    setFormVesting(offer.vestingSchedule);
    setFormBenefits(offer.benefitsAnnualValue);
    setFormColTier(offer.costOfLivingTier);
    setFormDeadline(offer.offerDeadline || "");
    setFormNotes(offer.notes || "");
    setIsOfferFormOpen(true);
  };

  // Save Add/Edit Offer
  const handleSaveOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim()) return;

    if (editingOfferId) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === editingOfferId
            ? {
                ...o,
                company: formCompany.trim(),
                roleTitle: formRole.trim(),
                location: formLocation.trim(),
                workMode: formWorkMode,
                currency: formCurrency,
                baseSalary: Number(formBaseSalary) || 0,
                signingBonus: Number(formSigningBonus) || 0,
                annualBonusPercent: Number(formBonusPercent) || 0,
                equityTotalValue: Number(formEquity) || 0,
                vestingSchedule: formVesting,
                benefitsAnnualValue: Number(formBenefits) || 0,
                costOfLivingTier: formColTier,
                offerDeadline: formDeadline || undefined,
                notes: formNotes || undefined,
              }
            : o
        )
      );
    } else {
      const newOffer: JobOffer = {
        id: `offer_${Date.now()}`,
        applicationId: initialSelectedApp?.applicationId,
        company: formCompany.trim(),
        roleTitle: formRole.trim(),
        location: formLocation.trim(),
        workMode: formWorkMode,
        currency: formCurrency,
        baseSalary: Number(formBaseSalary) || 0,
        signingBonus: Number(formSigningBonus) || 0,
        annualBonusPercent: Number(formBonusPercent) || 0,
        equityTotalValue: Number(formEquity) || 0,
        vestingSchedule: formVesting,
        benefitsAnnualValue: Number(formBenefits) || 0,
        costOfLivingTier: formColTier,
        offerDeadline: formDeadline || undefined,
        notes: formNotes || undefined,
        createdAt: new Date().toISOString(),
      };
      setOffers((prev) => [newOffer, ...prev]);
      setSelectedOfferId(newOffer.id);
    }

    setIsOfferFormOpen(false);
    setEditingOfferId(null);
  };

  // Delete Offer
  const handleDeleteOffer = (id: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
    if (selectedOfferId === id) {
      const remaining = offers.filter((o) => o.id !== id);
      if (remaining.length > 0) setSelectedOfferId(remaining[0].id);
    }
  };

  // Import from an existing application
  const handleImportApplication = (app: JobApplication) => {
    const parsed = parseSalaryStringToNumeric(app.salary);
    const newOffer: JobOffer = {
      id: `offer_${Date.now()}`,
      applicationId: app.applicationId,
      company: app.company,
      roleTitle: app.jobTitle,
      location: app.location || "Remote",
      workMode: app.workMode || "Hybrid",
      currency: parsed.currency,
      baseSalary: parsed.base,
      signingBonus: 50000,
      annualBonusPercent: 10,
      equityTotalValue: 300000,
      vestingSchedule: "Standard 4-Year (25%/yr, 1-yr cliff)",
      benefitsAnnualValue: 60000,
      costOfLivingTier:
        app.workMode === "Remote"
          ? "Tier 3 / Remote (Low CoL)"
          : "Metro Tier 1 (High CoL)",
      offerDeadline: app.deadline,
      notes: `Imported from JobPlanner Application Tracker (${app.company})`,
      createdAt: new Date().toISOString(),
    };

    setOffers((prev) => [newOffer, ...prev]);
    setSelectedOfferId(newOffer.id);
    setActiveTab("compare");
  };

  // Handle AI Negotiation Generation
  const handleGenerateNegotiation = async () => {
    if (!currentOfferCalculation) return;

    setIsGeneratingAi(true);
    const targetBase = targetBaseInput ? parseInt(targetBaseInput.replace(/[^0-9]/g, ""), 10) : undefined;

    const requestPayload = {
      offer: currentOfferCalculation.offer,
      competingOffers: offers.filter((o) => o.id !== selectedOfferId),
      userTargetRole: targetRole,
      userSkills: profile?.skills || [],
      readinessScore: careerReadinessScore || 78,
      negotiationGoal,
      tone: negotiationTone,
      targetBaseSalary: targetBase,
      additionalRequests: additionalNotesInput,
    };

    try {
      const res = await fetch("/api/ai/offers/evaluate-and-negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.emailBody && data.emailSubject) {
          setNegotiationResult(data);
          setIsGeneratingAi(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Notice: Falling back to client-side heuristic negotiation generator:", e);
    }

    // Resilient offline heuristic generator
    const heuristicResult = generateHeuristicNegotiationScript(requestPayload);
    setNegotiationResult(heuristicResult);
    setIsGeneratingAi(false);
  };

  // Copy with visual feedback & confetti trigger
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#C85A32", "#E7B89E", "#345B3C"],
    });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="sticky top-0 z-20 bg-[#FAF8F5]/98 backdrop-blur-md border-b border-[#E7E2DA] px-5 sm:px-7 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF0EB] border border-[#F2DECA] flex items-center justify-center text-[#C85A32]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-editorial">
                  Offer & Compensation Calculator
                </h2>
                <span className="text-[10px] font-bold text-[#A64522] bg-[#FBEFE9] px-2 py-0.5 rounded-full border border-[#F3DACF]">
                  Beta
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Benchmark salary packages, simulate vesting & cost-of-living, and generate counter-offers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#FFFFFF] border border-[#E7E2DA] flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-[#F2ECE4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 sm:px-7 pt-3 bg-[#FAF8F5] border-b border-[#E7E2DA] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("compare")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "compare"
                  ? "bg-[#FFFFFF] text-[#C85A32] border-t-2 border-x border-t-[#C85A32] border-x-[#E7E2DA] shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-[#F2EDE5]"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Compare Offers ({offers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("vesting")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "vesting"
                  ? "bg-[#FFFFFF] text-[#C85A32] border-t-2 border-x border-t-[#C85A32] border-x-[#E7E2DA] shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-[#F2EDE5]"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Vesting & Purchasing Power</span>
            </button>

            <button
              onClick={() => setActiveTab("negotiate")}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "negotiate"
                  ? "bg-[#FFFFFF] text-[#C85A32] border-t-2 border-x border-t-[#C85A32] border-x-[#E7E2DA] shadow-xs"
                  : "text-stone-600 hover:text-stone-900 hover:bg-[#F2EDE5]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>AI Negotiation Coach</span>
            </button>
          </div>

          <div className="pb-2">
            <button
              onClick={handleOpenAddForm}
              className="px-3 py-1.5 rounded-lg bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Offer</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-7 space-y-6 flex-1">
          {/* TAB 1: COMPARE OFFERS */}
          {activeTab === "compare" && (
            <div className="space-y-6">
              {/* Top Benchmark & Quick Highlights Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#F2DECA] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Role Market Benchmark
                    </span>
                    <span className="text-[10px] font-semibold text-[#A64522] bg-[#FAF0EB] px-2 py-0.5 rounded">
                      {targetRole}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-stone-900 font-editorial">
                    {benchmarkRange}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Standard industry entry base range for this role.
                  </p>
                </div>

                {bestOffersSummary?.highestTotal && (
                  <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#166534] uppercase tracking-wider">
                        Top Year 1 Total Comp
                      </span>
                      <Award className="w-3.5 h-3.5 text-[#166534]" />
                    </div>
                    <div className="text-lg font-bold text-[#14532D] font-editorial">
                      {formatCompensationAmount(
                        bestOffersSummary.highestTotal.year1TotalComp,
                        bestOffersSummary.highestTotal.offer.currency
                      )}
                    </div>
                    <p className="text-[11px] text-[#166534] font-medium">
                      {bestOffersSummary.highestTotal.offer.company} (
                      {bestOffersSummary.highestTotal.offer.roleTitle})
                    </p>
                  </div>
                )}

                {bestOffersSummary?.highestColAdjusted && (
                  <div className="p-4 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#1E40AF] uppercase tracking-wider">
                        Highest CoL Real Value
                      </span>
                      <Scale className="w-3.5 h-3.5 text-[#1E40AF]" />
                    </div>
                    <div className="text-lg font-bold text-[#1E3A8A] font-editorial">
                      {formatCompensationAmount(
                        bestOffersSummary.highestColAdjusted.colAdjustedAnnualComp,
                        bestOffersSummary.highestColAdjusted.offer.currency
                      )}
                    </div>
                    <p className="text-[11px] text-[#1E40AF] font-medium">
                      {bestOffersSummary.highestColAdjusted.offer.company} (
                      {bestOffersSummary.highestColAdjusted.offer.costOfLivingTier.split(" ")[0]} purchasing power)
                    </p>
                  </div>
                )}
              </div>

              {/* Offers Comparison Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {calculatedOffers.map((item) => {
                  const { offer, year1TotalComp, year1Cash, year1Equity, benchmarkComparison } = item;
                  const isSelected = selectedOfferId === offer.id;

                  return (
                    <div
                      key={offer.id}
                      className={`rounded-2xl border transition-all flex flex-col overflow-hidden bg-[#FFFFFF] ${
                        isSelected
                          ? "border-[#C85A32] shadow-md ring-2 ring-[#C85A32]/10"
                          : "border-[#E7E2DA] shadow-xs hover:border-[#D5CDC2]"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-4.5 border-b border-[#F0ECE4] bg-[#FAF8F5]/60 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFFFFF] text-stone-700 border border-[#E7E2DA]">
                              {offer.workMode}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                benchmarkComparison.status === "Top Tier"
                                  ? "bg-[#EDF5EE] text-[#2C4E33] border-[#D7E5DA]"
                                  : benchmarkComparison.status === "Below Market"
                                  ? "bg-[#FAF0EB] text-[#A64522] border-[#F2D7CC]"
                                  : "bg-[#F3F4F6] text-stone-700 border-[#E5E7EB]"
                              }`}
                            >
                              {benchmarkComparison.status}
                            </span>
                          </div>

                          <h3 className="font-bold text-base text-stone-900 mt-2 font-editorial">
                            {offer.company}
                          </h3>
                          <p className="text-xs text-stone-600 font-medium">
                            {offer.roleTitle}
                          </p>
                          <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{offer.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditForm(offer)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-[#F2ECE4] transition-colors cursor-pointer"
                            title="Edit Offer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Metric Hero */}
                      <div className="p-4.5 bg-[#FFFDF9] border-b border-[#F2DECA]/60">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                          Year 1 Total Compensation
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-[#C85A32] font-editorial">
                            {formatCompensationAmount(year1TotalComp, offer.currency)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-stone-500 flex items-center justify-between">
                          <span>Annualized 4-Yr Avg:</span>
                          <span className="font-semibold text-stone-800">
                            {formatCompensationAmount(item.annualizedTotalComp, offer.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Line Item Breakdown */}
                      <div className="p-4.5 space-y-2 text-xs flex-1">
                        <div className="flex items-center justify-between text-stone-600">
                          <span>Base Salary (Annual):</span>
                          <span className="font-bold text-stone-900">
                            {formatCompensationAmount(offer.baseSalary, offer.currency)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-stone-600">
                          <span>Performance Bonus ({offer.annualBonusPercent}%):</span>
                          <span className="font-semibold text-stone-800">
                            {formatCompensationAmount(
                              Math.round(offer.baseSalary * (offer.annualBonusPercent / 100)),
                              offer.currency
                            )}
                          </span>
                        </div>

                        {offer.signingBonus > 0 && (
                          <div className="flex items-center justify-between text-stone-600">
                            <span>Signing Bonus (Yr 1):</span>
                            <span className="font-semibold text-[#059669]">
                              +{formatCompensationAmount(offer.signingBonus, offer.currency)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-stone-600">
                          <span>Equity (Yr 1 Vested):</span>
                          <span className="font-semibold text-stone-800">
                            {formatCompensationAmount(year1Equity, offer.currency)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-stone-600">
                          <span>Benefits & Perks:</span>
                          <span className="font-semibold text-stone-800">
                            {formatCompensationAmount(offer.benefitsAnnualValue, offer.currency)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-[#F2ECE4] flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">CoL Real Value:</span>
                          <span className="font-bold text-[#1E40AF]">
                            {formatCompensationAmount(item.colAdjustedAnnualComp, offer.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Card Bottom CTA */}
                      <div className="p-3 bg-[#FAF8F5] border-t border-[#E7E2DA] flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOfferId(offer.id);
                            setActiveTab("negotiate");
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Negotiate</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedOfferId(offer.id);
                            setActiveTab("vesting");
                          }}
                          className="py-1.5 px-3 rounded-lg bg-[#FFFFFF] hover:bg-[#F2ECE4] text-stone-700 text-xs font-semibold border border-[#E7E2DA] transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Import from Applications Banner */}
              {applications.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#C85A32]" />
                      Import from Your Job Applications
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Auto-fill company, role, & salary info
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {applications
                      .filter(
                        (a) =>
                          !offers.some((o) => o.applicationId === a.applicationId)
                      )
                      .slice(0, 6)
                      .map((app) => (
                        <button
                          key={app.applicationId}
                          onClick={() => handleImportApplication(app)}
                          className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F2ECE4] border border-[#E0D7CC] text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer group"
                        >
                          <Plus className="w-3 h-3 text-[#C85A32] group-hover:scale-125 transition-transform" />
                          <span>
                            {app.company} ({app.jobTitle})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VESTING SCHEDULE & PURCHASING POWER */}
          {activeTab === "vesting" && currentOfferCalculation && (
            <div className="space-y-6">
              {/* Offer Selector Bar */}
              <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-600">Inspecting Offer:</span>
                  <select
                    value={selectedOfferId}
                    onChange={(e) => setSelectedOfferId(e.target.value)}
                    className="text-xs font-bold bg-[#FFFFFF] border border-[#E7E2DA] rounded-lg px-3 py-1.5 text-stone-800 cursor-pointer focus:outline-none"
                  >
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.company} – {o.roleTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-500">Vesting Schedule:</span>
                  <span className="font-semibold text-stone-800 bg-[#FFFFFF] px-2.5 py-1 rounded-md border border-[#E7E2DA]">
                    {currentOfferCalculation.offer.vestingSchedule}
                  </span>
                </div>
              </div>

              {/* 4-Year Vesting Projection Table */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#E7E2DA] bg-[#FAF8F5]/80 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#C85A32]" />
                    4-Year Cumulative Compensation Projection
                  </h3>
                  <span className="text-xs text-stone-500">
                    4-Year Total:{" "}
                    <strong className="text-stone-900 font-editorial text-sm">
                      {formatCompensationAmount(
                        currentOfferCalculation.fourYearTotalValue,
                        currentOfferCalculation.offer.currency
                      )}
                    </strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-[#E7E2DA] text-[11px] font-bold text-stone-500 uppercase">
                      <tr>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Base Salary</th>
                        <th className="py-3 px-4">Annual Bonus</th>
                        <th className="py-3 px-4">Signing Bonus</th>
                        <th className="py-3 px-4">Vested Equity</th>
                        <th className="py-3 px-4">Benefits</th>
                        <th className="py-3 px-4 text-right">Total Annual Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE4]">
                      {[1, 2, 3, 4].map((year) => {
                        const vestingPcts = getVestingSchedulePcts(
                          currentOfferCalculation.offer.vestingSchedule
                        );
                        const equityForYear = Math.round(
                          currentOfferCalculation.offer.equityTotalValue *
                            vestingPcts[year - 1]
                        );
                        const signingForYear =
                          year === 1 ? currentOfferCalculation.offer.signingBonus : 0;
                        const bonusForYear = Math.round(
                          currentOfferCalculation.offer.baseSalary *
                            (currentOfferCalculation.offer.annualBonusPercent / 100)
                        );
                        const totalYear =
                          currentOfferCalculation.offer.baseSalary +
                          bonusForYear +
                          signingForYear +
                          equityForYear +
                          currentOfferCalculation.offer.benefitsAnnualValue;

                        return (
                          <tr key={year} className="hover:bg-[#FAF8F5]/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-stone-900">
                              Year {year} {year === 1 && "(Cliff Year)"}
                            </td>
                            <td className="py-3 px-4 text-stone-700">
                              {formatCompensationAmount(
                                currentOfferCalculation.offer.baseSalary,
                                currentOfferCalculation.offer.currency
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-700">
                              {formatCompensationAmount(
                                bonusForYear,
                                currentOfferCalculation.offer.currency
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-700">
                              {signingForYear > 0 ? (
                                <span className="text-[#059669] font-semibold">
                                  {formatCompensationAmount(
                                    signingForYear,
                                    currentOfferCalculation.offer.currency
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-stone-800">
                              {equityForYear > 0 ? (
                                <span>
                                  {formatCompensationAmount(
                                    equityForYear,
                                    currentOfferCalculation.offer.currency
                                  )}{" "}
                                  <span className="text-[10px] text-stone-400">
                                    ({Math.round(vestingPcts[year - 1] * 100)}%)
                                  </span>
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-4 text-stone-600">
                              {formatCompensationAmount(
                                currentOfferCalculation.offer.benefitsAnnualValue,
                                currentOfferCalculation.offer.currency
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#C85A32] font-editorial text-sm">
                              {formatCompensationAmount(
                                totalYear,
                                currentOfferCalculation.offer.currency
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Cash Flow & CoL Simulator Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Monthly Cash Flow Card */}
                <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#F2DECA] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-[#A64522]" />
                      Estimated Monthly In-Hand Cash Flow
                    </h4>
                    <span className="text-[10px] font-semibold text-stone-500">Approximate</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#C85A32] font-editorial">
                      {formatCompensationAmount(
                        currentOfferCalculation.monthlyEstimatedCash,
                        currentOfferCalculation.offer.currency
                      )}
                    </span>
                    <span className="text-xs text-stone-500">/ month (post-deductions)</span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Estimated net monthly take-home assuming standard provident fund/tax withholding (~18-22% range for entry brackets). Excludes one-time bonuses and unvested stock.
                  </p>
                </div>

                {/* Cost of Living Multiplier Card */}
                <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#2563EB]" />
                      Cost-of-Living Purchasing Power
                    </h4>
                    <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                      {currentOfferCalculation.offer.costOfLivingTier.split(" ")[0]}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#1E3A8A] font-editorial">
                      {formatCompensationAmount(
                        currentOfferCalculation.colAdjustedAnnualComp,
                        currentOfferCalculation.offer.currency
                      )}
                    </span>
                    <span className="text-xs text-stone-500">equivalent in Tier 1 Metro</span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    A remote or Tier 2 offer allows ~20% to 54% higher savings on housing, transit, and living expenses compared to high-cost metro hubs like Bengaluru or Mumbai.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI SALARY NEGOTIATION COACH */}
          {activeTab === "negotiate" && currentOfferCalculation && (
            <div className="space-y-6">
              {/* Negotiation Input Form */}
              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-700">Negotiating for:</span>
                    <select
                      value={selectedOfferId}
                      onChange={(e) => setSelectedOfferId(e.target.value)}
                      className="text-xs font-bold bg-[#FFFFFF] border border-[#E7E2DA] rounded-lg px-3 py-1.5 text-stone-900 cursor-pointer focus:outline-none"
                    >
                      {offers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.company} – {o.roleTitle} (
                          {formatCompensationAmount(o.baseSalary, o.currency)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs text-stone-500 font-medium">
                    Current Base:{" "}
                    <strong className="text-stone-900">
                      {formatCompensationAmount(
                        currentOfferCalculation.offer.baseSalary,
                        currentOfferCalculation.offer.currency
                      )}
                    </strong>
                  </span>
                </div>

                {/* Strategy and Tone Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Negotiation Strategy Goal
                    </label>
                    <select
                      value={negotiationGoal}
                      onChange={(e) => setNegotiationGoal(e.target.value as NegotiationGoalType)}
                      className="w-full bg-[#FFFFFF] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="competing_offer">Leverage Competing Offer</option>
                      <option value="skills_and_merit">
                        Skill Merit & Technical Readiness Alignment
                      </option>
                      <option value="higher_base">Request Higher Base Salary (+12-18%)</option>
                      <option value="higher_bonus_or_equity">
                        Negotiate Higher Signing Bonus / Equity
                      </option>
                      <option value="remote_flexibility">
                        Request Remote Flexibility / Location Stipend
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Communication Tone
                    </label>
                    <select
                      value={negotiationTone}
                      onChange={(e) => setNegotiationTone(e.target.value as NegotiationToneType)}
                      className="w-full bg-[#FFFFFF] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="diplomatic_enthusiastic">
                        Diplomatic & Enthusiastic (Recommended for Freshers)
                      </option>
                      <option value="confident_value">
                        Confident & Value-Driven (Emphasizes ROI)
                      </option>
                      <option value="direct_corporate">
                        Direct & Professional (Standard Corporate)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Target Base and Additional Custom Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Target Base Salary (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. ${formatCompensationAmount(
                        Math.round(currentOfferCalculation.offer.baseSalary * 1.15),
                        currentOfferCalculation.offer.currency
                      )}`}
                      value={targetBaseInput}
                      onChange={(e) => setTargetBaseInput(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 focus:outline-none"
                    />
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Leave empty to auto-calculate standard +15% market uplift.
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Custom Talking Points / Details
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Also ask about 6-month performance review cycle"
                      value={additionalNotesInput}
                      onChange={(e) => setAdditionalNotesInput(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateNegotiation}
                  disabled={isGeneratingAi}
                  className="w-full py-2.5 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isGeneratingAi
                      ? "Generating AI Counter-Offer Strategy..."
                      : "Generate AI Negotiation Script & Strategy"}
                  </span>
                </button>
              </div>

              {/* Generated Strategy & Script Output */}
              {negotiationResult && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Subject Line & Email Body */}
                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
                      <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#C85A32]" />
                        Ready-to-Send Counter-Offer Email
                      </h3>
                      <button
                        onClick={() =>
                          handleCopyText(
                            `Subject: ${negotiationResult.emailSubject}\n\n${negotiationResult.emailBody}`,
                            "email"
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#FAF0EB] hover:bg-[#F2DECA] text-[#A64522] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedKey === "email" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#059669]" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                          Subject:
                        </span>
                        <div className="font-semibold text-stone-900 mt-0.5">
                          {negotiationResult.emailSubject}
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                          Body:
                        </span>
                        <pre className="mt-1 p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] text-stone-800 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                          {negotiationResult.emailBody}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Verbal Talking Points & Fallbacks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Talking Points for Phone Call */}
                    <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#F2DECA] space-y-2.5">
                      <h4 className="font-bold text-xs text-[#A64522] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Phone Call Talking Points
                      </h4>
                      <ul className="space-y-1.5 text-xs text-stone-700">
                        {negotiationResult.keyTalkingPoints.map((tp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#C85A32] font-bold">•</span>
                            <span>{tp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Fallback Plan If Recruiter Says No */}
                    <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-2.5">
                      <h4 className="font-bold text-xs text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        If They Say No: Counter-Levers
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#14532D]">
                        {negotiationResult.fallbacksIfDenied.map((fb, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#166534] font-bold">•</span>
                            <span>{fb}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Golden Rules of Negotiation */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2DA] space-y-2 text-xs">
                    <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[#C85A32]" />
                      Golden Rules of Salary Negotiation for Junior Candidates
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600">
                      {negotiationResult.negotiationTips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-[#059669] shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Form: Add or Edit an Offer */}
        {isOfferFormOpen && (
          <div
            className="fixed inset-0 z-60 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
            onClick={() => setIsOfferFormOpen(false)}
          >
            <div
              className="bg-[#FFFFFF] rounded-2xl border border-[#E7E2DA] max-w-xl w-full p-5 sm:p-7 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-3">
                <h3 className="font-bold text-base text-stone-900 font-editorial">
                  {editingOfferId ? "Edit Job Offer" : "Add New Job Offer"}
                </h3>
                <button
                  onClick={() => setIsOfferFormOpen(false)}
                  className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E7E2DA] flex items-center justify-center text-stone-400 hover:text-stone-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleSaveOffer} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Swiggy / Google"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Role Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Currency</label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 font-medium cursor-pointer"
                    >
                      <option value="₹">₹ (INR)</option>
                      <option value="$">$ (USD)</option>
                      <option value="€">€ (EUR)</option>
                      <option value="£">£ (GBP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Work Mode</label>
                    <select
                      value={formWorkMode}
                      onChange={(e) => setFormWorkMode(e.target.value as any)}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 font-medium cursor-pointer"
                    >
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                      <option value="Onsite">Onsite</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Cost of Living</label>
                    <select
                      value={formColTier}
                      onChange={(e) => setFormColTier(e.target.value as any)}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 font-medium cursor-pointer"
                    >
                      <option value="Metro Tier 1 (High CoL)">Tier 1 Metro</option>
                      <option value="Urban Tier 2 (Moderate CoL)">Tier 2 City</option>
                      <option value="Tier 3 / Remote (Low CoL)">Tier 3 / Remote</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Annual Base Salary *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 800000"
                      value={formBaseSalary}
                      onChange={(e) => setFormBaseSalary(Number(e.target.value))}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Signing Bonus (One-time)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={formSigningBonus}
                      onChange={(e) => setFormSigningBonus(Number(e.target.value))}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Annual Bonus Target (%)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={formBonusPercent}
                      onChange={(e) => setFormBonusPercent(Number(e.target.value))}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Equity Total Grant Value
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 400000"
                      value={formEquity}
                      onChange={(e) => setFormEquity(Number(e.target.value))}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Vesting Schedule
                    </label>
                    <select
                      value={formVesting}
                      onChange={(e) => setFormVesting(e.target.value as any)}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-800 font-medium cursor-pointer"
                    >
                      <option value="Standard 4-Year (25%/yr, 1-yr cliff)">
                        Standard 4-Year (25%/yr, 1-yr cliff)
                      </option>
                      <option value="Backloaded (5/15/40/40)">
                        Backloaded (5/15/40/40)
                      </option>
                      <option value="Equal 3-Year">Equal 3-Year (33%/yr)</option>
                      <option value="Immediate / None">Immediate / None</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Annual Benefits & Perks Value
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 60000"
                      value={formBenefits}
                      onChange={(e) => setFormBenefits(Number(e.target.value))}
                      className="w-full bg-[#FAF8F5] border border-[#E7E2DA] rounded-lg p-2 text-stone-900 font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E2DA]">
                  <button
                    type="button"
                    onClick={() => setIsOfferFormOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E7E2DA] text-stone-700 font-semibold hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#C85A32] hover:bg-[#B24E2A] text-white font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {editingOfferId ? "Update Offer" : "Save Offer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
