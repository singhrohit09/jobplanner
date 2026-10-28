import {
  JobOffer,
  OfferBreakdownCalculation,
  OfferNegotiationRequest,
  OfferNegotiationResult,
  VestingScheduleType,
  CostOfLivingTier,
} from "../types";

/**
 * Cost of living purchasing power multipliers relative to Tier 1 Metro.
 * In a lower cost-of-living location, the same nominal compensation buys more goods/housing.
 */
export const COL_FACTORS: Record<CostOfLivingTier, { costFactor: number; stretchMultiplier: number }> = {
  "Metro Tier 1 (High CoL)": { costFactor: 1.0, stretchMultiplier: 1.0 },
  "Urban Tier 2 (Moderate CoL)": { costFactor: 0.8, stretchMultiplier: 1.25 },
  "Tier 3 / Remote (Low CoL)": { costFactor: 0.65, stretchMultiplier: 1.54 },
};

/**
 * Vesting percentage breakdown over 4 years
 */
export function getVestingSchedulePcts(type: VestingScheduleType): [number, number, number, number] {
  switch (type) {
    case "Standard 4-Year (25%/yr, 1-yr cliff)":
      return [0.25, 0.25, 0.25, 0.25];
    case "Backloaded (5/15/40/40)":
      return [0.05, 0.15, 0.4, 0.4];
    case "Equal 3-Year":
      return [0.3333, 0.3333, 0.3334, 0];
    case "Immediate / None":
      return [1.0, 0, 0, 0];
    default:
      return [0.25, 0.25, 0.25, 0.25];
  }
}

/**
 * Parses user or job listing salary string into a clean numeric base and currency
 */
export function parseSalaryStringToNumeric(salaryStr?: string): { base: number; currency: string } {
  if (!salaryStr || typeof salaryStr !== "string") {
    return { base: 600000, currency: "₹" };
  }

  const str = salaryStr.trim();
  const currency = str.includes("$") ? "$" : str.includes("€") ? "€" : str.includes("£") ? "£" : "₹";

  // Check for LPA format e.g. "6.5 LPA", "₹8 - ₹12 LPA"
  const lpaMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:-|to)?\s*([0-9]+(?:\.[0-9]+)?)?\s*LPA/i);
  if (lpaMatch) {
    const minVal = parseFloat(lpaMatch[1]);
    const maxVal = lpaMatch[2] ? parseFloat(lpaMatch[2]) : minVal;
    const avgLakhs = (minVal + maxVal) / 2;
    return { base: Math.round(avgLakhs * 100000), currency };
  }

  // Check for standard numeric string like "85000", "75,000", "₹7,50,000"
  const digitsOnly = str.replace(/[^0-9]/g, "");
  if (digitsOnly.length >= 4) {
    const parsed = parseInt(digitsOnly, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return { base: parsed, currency };
    }
  }

  return { base: 600000, currency };
}

/**
 * Formats a currency amount into standard human-readable display (e.g. ₹7.5 LPA or $95,000)
 */
export function formatCompensationAmount(val: number, currency: string = "₹"): string {
  if (isNaN(val) || val <= 0) return `${currency}0`;

  if (currency === "₹") {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} LPA`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  }

  if (val >= 1000000) {
    return `${currency}${(val / 1000000).toFixed(2)}M`;
  }
  if (val >= 1000) {
    return `${currency}${(val / 1000).toFixed(0)}k`;
  }
  return `${currency}${val.toLocaleString("en-US")}`;
}

/**
 * Computes full breakdown, year 1 total compensation, annualized value, and benchmark alignment
 */
export function calculateOfferBreakdown(
  offer: JobOffer,
  benchmarkSalaryRange?: string
): OfferBreakdownCalculation {
  const base = Math.max(0, offer.baseSalary || 0);
  const signing = Math.max(0, offer.signingBonus || 0);
  const bonusPct = Math.max(0, offer.annualBonusPercent || 0);
  const annualBonus = Math.round(base * (bonusPct / 100));
  const equityTotal = Math.max(0, offer.equityTotalValue || 0);
  const benefits = Math.max(0, offer.benefitsAnnualValue || 0);

  const vestingPcts = getVestingSchedulePcts(offer.vestingSchedule);
  const year1Equity = Math.round(equityTotal * vestingPcts[0]);
  const year1Cash = base + signing + annualBonus;
  const year1TotalComp = year1Cash + year1Equity + benefits;

  // 4-year cumulative calculation
  const fourYearTotalValue = base * 4 + signing + annualBonus * 4 + equityTotal + benefits * 4;
  const annualizedTotalComp = Math.round(fourYearTotalValue / 4);

  // Approximate monthly take-home cash flow estimate (post basic deductions ~20-25%)
  const monthlyEstimatedCash = Math.round((base + annualBonus) / 12 * 0.82);

  // Cost-of-living purchasing power equivalent
  const colFactor = COL_FACTORS[offer.costOfLivingTier] || COL_FACTORS["Metro Tier 1 (High CoL)"];
  const colAdjustedAnnualComp = Math.round(annualizedTotalComp * colFactor.stretchMultiplier);

  // Benchmark parsing e.g. "₹5.5 - ₹11 LPA"
  let benchmarkLow = 500000;
  let benchmarkHigh = 1000000;
  if (benchmarkSalaryRange) {
    const parsed = parseSalaryStringToNumeric(benchmarkSalaryRange);
    const rangeMatch = benchmarkSalaryRange.match(/([0-9.]+)\s*-\s*([0-9.]+)\s*LPA/i);
    if (rangeMatch) {
      benchmarkLow = parseFloat(rangeMatch[1]) * 100000;
      benchmarkHigh = parseFloat(rangeMatch[2]) * 100000;
    } else {
      benchmarkLow = Math.round(parsed.base * 0.8);
      benchmarkHigh = Math.round(parsed.base * 1.3);
    }
  }

  let status: "Below Market" | "Competitive Median" | "Top Tier" = "Competitive Median";
  let percentileEstimate = 50;
  let message = "Competitive offer consistent with market averages.";

  if (base < benchmarkLow) {
    status = "Below Market";
    percentileEstimate = Math.max(15, Math.round((base / benchmarkLow) * 40));
    message = `Base salary is currently below the entry benchmark (${formatCompensationAmount(benchmarkLow, offer.currency)}). Good opportunity for a counter-offer.`;
  } else if (base >= benchmarkHigh) {
    status = "Top Tier";
    percentileEstimate = Math.min(95, 80 + Math.round(((base - benchmarkHigh) / benchmarkHigh) * 20));
    message = `Outstanding offer in the top tier for this role. Above standard benchmark (${formatCompensationAmount(benchmarkHigh, offer.currency)}).`;
  } else {
    status = "Competitive Median";
    const spread = benchmarkHigh - benchmarkLow;
    percentileEstimate = spread > 0 ? 45 + Math.round(((base - benchmarkLow) / spread) * 35) : 60;
    message = `Well-aligned with market median (${formatCompensationAmount(benchmarkLow, offer.currency)} – ${formatCompensationAmount(benchmarkHigh, offer.currency)}).`;
  }

  return {
    offer,
    year1Cash,
    year1Equity,
    year1TotalComp,
    annualizedTotalComp,
    fourYearTotalValue,
    monthlyEstimatedCash,
    colAdjustedAnnualComp,
    benchmarkComparison: {
      status,
      percentileEstimate,
      message,
    },
  };
}

/**
 * Generates an empirical heuristic negotiation package when offline or as instant preview
 */
export function generateHeuristicNegotiationScript(req: OfferNegotiationRequest): OfferNegotiationResult {
  const {
    offer,
    competingOffers = [],
    userTargetRole = "Software Engineer",
    userSkills = [],
    readinessScore = 75,
    negotiationGoal,
    tone,
    targetBaseSalary,
    additionalRequests,
  } = req;

  const currentBase = offer.baseSalary;
  const currency = offer.currency || "₹";

  // Target base salary calculation: either user specified or standard +12% to +18% uplift
  const targetBase = targetBaseSalary && targetBaseSalary > currentBase
    ? targetBaseSalary
    : Math.round(currentBase * 1.15);

  const formattedCurrent = formatCompensationAmount(currentBase, currency);
  const formattedTarget = formatCompensationAmount(targetBase, currency);

  const bestCompetitor = competingOffers.length > 0
    ? [...competingOffers].sort((a, b) => b.baseSalary - a.baseSalary)[0]
    : null;

  const skillsHighlight = userSkills.slice(0, 3).join(", ") || "core domain technologies";

  let emailSubject = "";
  let emailBody = "";
  const keyTalkingPoints: string[] = [];
  const fallbacksIfDenied: string[] = [];

  switch (negotiationGoal) {
    case "competing_offer":
      emailSubject = `Re: Offer Discussion – ${offer.roleTitle} at ${offer.company} – [Your Name]`;
      emailBody = `Dear Hiring Team,\n\nThank you very much for extending the offer for the ${offer.roleTitle} position at ${offer.company}. I am genuinely excited about the team's mission and the opportunity to make an immediate impact with my skills in ${skillsHighlight}.\n\nAs I finalize my decision, I wanted to transparently share that I have received another active offer ${bestCompetitor ? `from ${bestCompetitor.company}` : "from another firm"} with a base compensation of ${bestCompetitor ? formatCompensationAmount(bestCompetitor.baseSalary, currency) : formattedTarget}.\n\nBecause ${offer.company} remains my absolute first choice due to the team culture and product roadmap, if we can bridge the base compensation to ${formattedTarget}, I would be delighted to sign and formally accept right away.\n\nThank you again for your time and partnership. I look forward to hearing your thoughts.\n\nWarm regards,\n[Your Name]\n[Your Contact Information]`;
      keyTalkingPoints.push(
        `Express genuine enthusiasm: Reiterate that ${offer.company} is your top preference.`,
        `Frame the competing offer politely as market validation, not an ultimatum.`,
        `Commit to signing immediately if the gap is closed to ${formattedTarget}.`
      );
      fallbacksIfDenied.push(
        `If base cannot move: Request a one-time signing bonus of ${formatCompensationAmount(Math.round(currentBase * 0.1), currency)} to bridge Year 1 total comp.`,
        `Ask for an accelerated 6-month performance & compensation review milestone.`
      );
      break;

    case "skills_and_merit":
      emailSubject = `Discussion Regarding Offer Terms – ${offer.roleTitle} – [Your Name]`;
      emailBody = `Dear Hiring Team,\n\nThank you sincerely for offering me the ${offer.roleTitle} role at ${offer.company}. I thoroughly enjoyed meeting the team throughout the interviews and am enthusiastic about contributing.\n\nBased on my verified technical readiness score (${readinessScore}/100) and hands-on portfolio in ${skillsHighlight}, I am confident in ramping up quickly and delivering measurable outcomes for the team from day one.\n\nReflecting industry benchmarks for this role and the specific scope of responsibilities, would ${offer.company} be open to adjusting the base salary to ${formattedTarget}?\n\nI am eager to contribute to the upcoming roadmap and look forward to your thoughts on this adjustment.\n\nBest regards,\n[Your Name]`;
      keyTalkingPoints.push(
        `Anchor on demonstrated outcomes: Mention specific project deliverables and skills in ${skillsHighlight}.`,
        `Emphasize low ramp-up time and high readiness (${readinessScore}/100 benchmark).`,
        `Keep dialogue collaborative: 'Would you be open to...' rather than demands.`
      );
      fallbacksIfDenied.push(
        `Request an allocated annual learning & certification stipend (e.g. cloud/AI certifications).`,
        `Inquire about performance bonus tiering and milestone bonuses.`
      );
      break;

    case "higher_bonus_or_equity":
      emailSubject = `Offer Review: Compensation Structure – ${offer.roleTitle} – [Your Name]`;
      emailBody = `Dear Hiring Team,\n\nThank you again for the offer to join ${offer.company} as a ${offer.roleTitle}. I am enthusiastic about the opportunity to partner with the team.\n\nI understand that base salary bands can be fixed for this level. If the base salary cannot be adjusted, would it be possible to explore an increase in the signing bonus or equity grant value to better align the overall Year 1 package to ${formattedTarget}?\n\nThis would make accepting the offer an easy decision for me while staying within your base band structure.\n\nThank you for your flexibility and support.\n\nWarmly,\n[Your Name]`;
      keyTalkingPoints.push(
        `Acknowledge company constraints: Recruiters appreciate candidates who understand fixed salary bands.`,
        `Propose variable levers: One-time signing bonus or additional RSUs/equity.`,
        `Remind them of immediate commitment upon agreement.`
      );
      fallbacksIfDenied.push(
        `Ask for relocation/work-from-home setup reimbursement.`,
        `Request guaranteed bonus payout floor for Year 1.`
      );
      break;

    case "remote_flexibility":
      emailSubject = `Discussion Regarding Work Mode & Offer – ${offer.roleTitle} – [Your Name]`;
      emailBody = `Dear Hiring Team,\n\nThank you very much for the offer to join ${offer.company}! I am eager to join the team and contribute to our goals.\n\nAlongside reviewing the compensation package, I wanted to discuss the flexibility of a ${offer.workMode === "Onsite" ? "Hybrid / Remote" : "Flexible Remote"} arrangement. Having an established home setup, I have consistently achieved high productivity in remote workflows.\n\nCould we document flexibility for remote days, or discuss an updated location stipend? This would allow me to fully commit with confidence.\n\nThank you so much for considering this.\n\nSincerely,\n[Your Name]`;
      keyTalkingPoints.push(
        `Highlight proven self-management and past remote project track record.`,
        `Clarify willingness to attend key sprints, planning days, or in-person team workshops.`
      );
      fallbacksIfDenied.push(
        `Request 2 work-from-home days per week or monthly travel allowance.`,
        `Request home office setup allowance.`
      );
      break;

    default: // higher_base
      emailSubject = `Compensation Discussion – ${offer.roleTitle} at ${offer.company} – [Your Name]`;
      emailBody = `Dear Hiring Team,\n\nThank you very much for offering me the position of ${offer.roleTitle} at ${offer.company}. I am excited about the opportunity to work with the team.\n\nI have carefully reviewed the offer of ${formattedCurrent}. Given current market benchmarks for this role and my technical background in ${skillsHighlight}, I was hoping we could explore a base salary of ${formattedTarget}.\n\nClosing this adjustment would allow me to accept the offer without hesitation. Thank you for your consideration, and I look forward to your perspective.\n\nSincerely,\n[Your Name]`;
      keyTalkingPoints.push(
        `Keep it concise, polite, and confident.`,
        `Give an exact, well-researched number (${formattedTarget}).`,
        `Reaffirm your enthusiasm to join the team immediately.`
      );
      fallbacksIfDenied.push(
        `Ask for an early 6-month salary review tied to specific OKRs/KPIs.`,
        `Request additional paid time off or flexible working hours.`
      );
  }

  // Tone adjustments
  if (tone === "direct_corporate") {
    emailBody = emailBody.replace("I am genuinely excited", "I am pleased to receive the offer");
    emailBody = emailBody.replace("I would be delighted to sign", "I will be prepared to execute the agreement");
  } else if (tone === "diplomatic_enthusiastic") {
    emailBody = emailBody.replace("I was hoping we could explore", "I would be deeply grateful if we could explore");
  }

  if (additionalRequests?.trim()) {
    emailBody += `\n\nAdditionally, I would appreciate discussing: ${additionalRequests.trim()}.`;
  }

  const suggestedBaseRange = `${formatCompensationAmount(Math.round(currentBase * 1.1), currency)} – ${formatCompensationAmount(Math.round(currentBase * 1.2), currency)}`;

  return {
    emailSubject,
    emailBody,
    keyTalkingPoints,
    counterOfferBreakdown: {
      suggestedBaseRange,
      suggestedSigningBonusRange: formatCompensationAmount(Math.round(currentBase * 0.08), currency),
      suggestedEquityRange: offer.equityTotalValue > 0
        ? formatCompensationAmount(Math.round(offer.equityTotalValue * 1.2), currency)
        : undefined,
    },
    fallbacksIfDenied,
    negotiationTips: [
      "Never negotiate until you have a written offer letter in hand.",
      "Always negotiate via phone if possible first, then summarize in writing via email.",
      "Focus on the value you bring to their upcoming business objectives rather than personal expenses.",
      "Be prepared to say 'Yes' immediately if they meet your requested target.",
      "Get all verbal concessions updated in a revised formal offer letter before signing.",
    ],
  };
}

/**
 * Pre-seeded sample offers for instant exploration
 */
export const SAMPLE_DEFAULT_OFFERS: JobOffer[] = [
  {
    id: "sample_offer_1",
    company: "Zomato",
    roleTitle: "Associate Software Engineer",
    location: "Gurugram / Bengaluru",
    workMode: "Hybrid",
    currency: "₹",
    baseSalary: 850000,
    signingBonus: 100000,
    annualBonusPercent: 10,
    equityTotalValue: 400000,
    vestingSchedule: "Standard 4-Year (25%/yr, 1-yr cliff)",
    benefitsAnnualValue: 80000,
    costOfLivingTier: "Metro Tier 1 (High CoL)",
    offerDeadline: "2026-11-15",
    notes: "Top food delivery platform. Strong engineering team working on microservices.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample_offer_2",
    company: "Razorpay",
    roleTitle: "Junior Full Stack Developer",
    location: "Bengaluru",
    workMode: "Hybrid",
    currency: "₹",
    baseSalary: 950000,
    signingBonus: 50000,
    annualBonusPercent: 12,
    equityTotalValue: 600000,
    vestingSchedule: "Standard 4-Year (25%/yr, 1-yr cliff)",
    benefitsAnnualValue: 120000,
    costOfLivingTier: "Metro Tier 1 (High CoL)",
    offerDeadline: "2026-11-20",
    notes: "Fintech leader. High growth, competitive ESOP pool, and comprehensive medical cover.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample_offer_3",
    company: "RemoteLabs Global",
    roleTitle: "Frontend Engineer (React/TypeScript)",
    location: "Remote",
    workMode: "Remote",
    currency: "₹",
    baseSalary: 780000,
    signingBonus: 0,
    annualBonusPercent: 8,
    equityTotalValue: 200000,
    vestingSchedule: "Standard 4-Year (25%/yr, 1-yr cliff)",
    benefitsAnnualValue: 60000,
    costOfLivingTier: "Tier 3 / Remote (Low CoL)",
    offerDeadline: "2026-11-25",
    notes: "100% remote flexibility with home office stipend. Saves city rental costs.",
    createdAt: new Date().toISOString(),
  },
];
