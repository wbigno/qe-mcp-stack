import React from "react";
import { Globe, Server, Cloud, Rocket } from "lucide-react";
import type { Environment } from "../../types/infrastructure";

interface EnvironmentSelectorProps {
  selected: Environment;
  onChange: (env: Environment) => void;
}

const ENVIRONMENTS: {
  key: Environment;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    key: "local",
    label: "Local",
    icon: <Server className="w-3 h-3" />,
    color: "text-gray-400",
  },
  {
    key: "dev",
    label: "Dev",
    icon: <Globe className="w-3 h-3" />,
    color: "text-blue-400",
  },
  {
    key: "staging",
    label: "Staging",
    icon: <Cloud className="w-3 h-3" />,
    color: "text-yellow-400",
  },
  {
    key: "prod",
    label: "Prod",
    icon: <Rocket className="w-3 h-3" />,
    color: "text-green-400",
  },
];

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-1 bg-tertiary rounded-lg p-1">
      {ENVIRONMENTS.map((env) => (
        <button
          key={env.key}
          onClick={() => onChange(env.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            selected === env.key
              ? "bg-primary border border-secondary shadow-sm"
              : "hover:bg-primary/50"
          }`}
        >
          <span className={selected === env.key ? env.color : "text-tertiary"}>
            {env.icon}
          </span>
          <span
            className={selected === env.key ? "text-primary" : "text-secondary"}
          >
            {env.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default EnvironmentSelector;
