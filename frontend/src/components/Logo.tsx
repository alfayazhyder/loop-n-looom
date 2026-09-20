import Image from "next/image";

interface LogoProps {
  size?: number;
  priority?: boolean;
  className?: string;
}

export default function Logo({
  size = 120,
  priority = false,
  className = "",
}: LogoProps) {
  return (
    <Image
      src="/images/logo.png"
      alt="LOOP_N_LOOOM"
      width={size}
      height={size}
      priority={priority}
      className={`h-auto w-auto ${className}`}
    />
  );
}