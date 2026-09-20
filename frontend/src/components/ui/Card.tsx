import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "small" | "medium" | "large";
}

const paddingStyles = {
  none: "",
  small: "p-4",
  medium: "p-6",
  large: "p-8",
};

export default function Card({
  children,
  padding = "medium",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-[#EADFD8]
        bg-white
        shadow-[0_4px_20px_rgba(74,59,50,0.06)]
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}