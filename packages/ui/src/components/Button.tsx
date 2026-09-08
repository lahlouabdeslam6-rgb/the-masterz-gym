import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "dark";
  size?: "sm" | "md" | "lg";
}

export function buttonStyles({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} = {}) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2.5 rounded-xl border font-bold uppercase tracking-[0.055em] leading-snug transition duration-200 motion-safe:hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0";

  const variants = {
    primary:
      "border-primary bg-primary text-[#031116] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_16px_rgba(0,212,255,0.12)] hover:border-primary hover:bg-primary hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_24px_rgba(0,212,255,0.25)]",
    secondary:
      "border-secondary bg-secondary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_16px_rgba(0,71,255,0.18)] hover:border-secondary hover:bg-secondary hover:shadow-[0_8px_24px_rgba(0,71,255,0.3)]",
    outline:
      "border-white/20 bg-white/[0.025] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-primary/60 hover:bg-primary/[0.08] hover:text-primary",
    ghost:
      "border-transparent bg-transparent text-gray-300 hover:bg-white/5 hover:text-white",
    dark:
      "border-[#031116] bg-[#031116] text-white shadow-[0_4px_16px_rgba(3,17,22,0.14)] hover:border-primary/50 hover:bg-[#07141c] hover:text-primary",
  };

  const sizes = {
    sm: "min-h-9 px-4 py-2 text-[0.7rem]",
    md: "min-h-11 px-6 py-3 text-xs",
    lg: "min-h-[3.25rem] px-7 py-3.5 text-sm md:min-h-14 md:px-8",
  };

  return `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonStyles({ variant, size, className })}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
