import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-brand-cocoa"
        >
          {label}
        </label>
      )}

      <input
        id={id}
        className={`
          min-h-12
          w-full
          rounded-2xl
          border
          bg-white
          px-4
          text-sm
          text-brand-cocoa
          outline-none
          transition-all
          duration-200
          placeholder:text-[#A99B92]
          ${
            error
              ? "border-[#A95757] focus:border-[#A95757]"
              : "border-[#EADFD8] focus:border-brand-cocoa"
          }
          ${className}
        `}
        {...props}
      />

      {error && (
        <p className="mt-2 text-sm text-[#A95757]">
          {error}
        </p>
      )}
    </div>
  );
}