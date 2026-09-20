import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "blush" | "beige" | "success" | "sale";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-brand-cocoa text-white",
  blush: "bg-brand-blush text-brand-cocoa",
  beige: "bg-brand-beige text-brand-cocoa",
  success: "bg-[#E8F1EA] text-[#557A61]",
  sale: "bg-[#F8E6E6] text-[#A95757]",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-3
        py-1
        text-xs
        font-semibold
        tracking-wide
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}