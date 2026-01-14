import React from "react";

interface MethodBadgeProps {
  method: string;
  className?: string;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({
  method,
  className = "",
}) => {
  const getMethodClass = (m: string): string => {
    switch (m.toUpperCase()) {
      case "GET":
        return "bg-green-500/20 text-green-400";
      case "POST":
        return "bg-blue-500/20 text-blue-400";
      case "PUT":
        return "bg-yellow-500/20 text-yellow-400";
      case "PATCH":
        return "bg-orange-500/20 text-orange-400";
      case "DELETE":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-bold ${getMethodClass(method)} ${className}`}
    >
      {method.toUpperCase()}
    </span>
  );
};

export default MethodBadge;
