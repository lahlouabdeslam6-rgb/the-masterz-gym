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
    "inline-flex items-center justify-center gap-2 rounded-sm border font-extrabold uppercase tracking-[0.08em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary:
      "border-primary bg-primary text-[#031116] shadow-[0_0_30px_rgba(0,212,255,0.16)] hover:border-white hover:bg-white hover:text-[#031116]",
    secondary:
      "border-secondary bg-secondary text-white shadow-[0_0_30px_rgba(0,71,255,0.18)] hover:border-primary hover:bg-primary hover:text-black",
    outline:
      "border-white/35 bg-transparent text-white hover:border-primary hover:bg-primary/10 hover:text-primary",
    ghost:
      "border-transparent bg-transparent text-gray-300 hover:bg-white/5 hover:text-white",
    dark:
      "border-[#031116] bg-[#031116] text-white shadow-[0_0_30px_rgba(3,17,22,0.14)] hover:border-white hover:bg-white hover:text-[#031116]",
  };

  const sizes = {
    sm: "h-9 px-4 text-[0.7rem]",
    md: "h-11 px-6 text-xs",
    lg: "h-[3.25rem] px-7 text-sm md:h-14 md:px-8",
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
