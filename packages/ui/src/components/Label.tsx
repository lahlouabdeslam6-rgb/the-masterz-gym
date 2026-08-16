import * as React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-xs font-bold uppercase leading-none tracking-[0.12em] text-gray-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
