import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-cocoa text-white border border-brand-cocoa hover:opacity-90",
  secondary:
    "bg-brand-blush text-brand-cocoa border border-brand-blush hover:bg-brand-beige",
  ghost:
    "bg-transparent text-brand-cocoa border border-brand-cocoa hover:bg-brand-blush",
};

const sizeStyles: Record<ButtonSize, string> = {
  small: "min-h-10 px-4 text-sm",
  medium: "min-h-12 px-6 text-sm",
  large: "min-h-14 px-8 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  className = "",
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const widthStyle = fullWidth ? "w-full" : "";

  const disabledStyle = disabled
    ? "cursor-not-allowed opacity-50"
    : "transition-all duration-200";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        inline-flex
        items-center
        justify-center
        rounded-full
        font-medium
        tracking-wide
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthStyle}
        ${disabledStyle}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}