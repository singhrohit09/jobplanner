import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtextClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  className = "",
  showText = false,
  textClassName = "",
  subtextClassName = "",
}) => {
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const imageSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/assets/jobplanner-logo.svg"
        alt="JobPlanner Logo"
        className={`${imageSize} object-contain rounded-xl shrink-0 transition-transform hover:scale-105 duration-200`}
        loading="eager"
      />
      {showText && (
        <div className="flex flex-col text-left">
          <span
            className={`font-bold text-stone-900 tracking-tight flex items-center gap-2 ${
              textClassName || "text-base"
            }`}
          >
            JobPlanner
            <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[#F3ECE4] text-[#8C4A2F] border border-[#E9DFD3]">
              For Students
            </span>
          </span>
          <p
            className={`text-stone-500 font-medium ${
              subtextClassName || "text-[11px]"
            }`}
          >
            Learn. Prepare. Get Hired.
          </p>
        </div>
      )}
    </div>
  );
};
