import React from "react";
import logoAsset from "../assets/Logo.svg";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", showWordmark = true }) => {
  const iconSize = size === "sm" ? 17 : size === "lg" ? 28 : 21;

  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src={logoAsset}
        alt="PromptNook"
        width={iconSize}
        height={iconSize}
        className="shrink-0"
        style={{ width: iconSize, height: iconSize }}
      />

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-baseline tracking-tight">
            <span className="font-bold text-base text-[#17233F]">Prompt</span>
            <span className="font-semibold text-base text-[#7655E8]">Nook</span>
          </div>
        </div>
      )}
    </div>
  );
};
