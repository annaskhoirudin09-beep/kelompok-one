"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LEDIndicatorProps {
  isOn: boolean;
  label: string;
}

const LEDIndicator: React.FC<LEDIndicatorProps> = ({ isOn, label }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg",
          isOn ? "bg-green-500 shadow-green-glow" : "bg-gray-400 shadow-gray-glow"
        )}
        style={{
          boxShadow: isOn
            ? "0 0 15px rgba(34, 197, 94, 0.7), 0 0 30px rgba(34, 197, 94, 0.5)"
            : "none",
        }}
      >
        {isOn ? "ON" : "OFF"}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
};

export default LEDIndicator;