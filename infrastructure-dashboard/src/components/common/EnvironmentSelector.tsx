import React from "react";
import type { Environment } from "../../types/infrastructure";

interface EnvironmentSelectorProps {
  selected: Environment;
  onChange: (env: Environment) => void;
}

const ENVIRONMENTS: {
  key: Environment;
  label: string;
}[] = [
  { key: "local", label: "Local" },
  { key: "dev", label: "Dev" },
  { key: "qa", label: "QA" },
  { key: "qa2", label: "QA2" },
  { key: "staging", label: "Staging" },
  { key: "preprod", label: "PreProd" },
  { key: "prod", label: "Prod" },
];

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-1.5">
      {ENVIRONMENTS.map((env) => {
        const isSelected = selected === env.key;
        return (
          <button
            key={env.key}
            onClick={() => onChange(env.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
            style={{
              backgroundColor: isSelected ? "#111827" : "#ffffff",
              borderColor: isSelected ? "#111827" : "#e5e7eb",
              color: isSelected ? "#ffffff" : "#111827",
            }}
          >
            {env.label}
          </button>
        );
      })}
    </div>
  );
};

export default EnvironmentSelector;
