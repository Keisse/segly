import * as React from "react";

import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, value, id, name, placeholder, ...props }, ref) => {
    const phoneHint = `${id ?? ""} ${name ?? ""} ${placeholder ?? ""}`.toLowerCase();
    const isPhone =
      type === "tel" ||
      phoneHint.includes("telefone") ||
      phoneHint.includes("phone") ||
      phoneHint.includes("whatsapp") ||
      phoneHint.includes("celular") ||
      phoneHint.includes("fone") ||
      phoneHint.includes("00000-0000") ||
      phoneHint.includes("99999-9999");

    const displayValue = isPhone && typeof value === "string" ? formatPhone(value) : value;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (isPhone) {
        event.target.value = formatPhone(event.target.value);
      }
      onChange?.(event);
    };

    return (
      <input
        type={isPhone ? "tel" : type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={displayValue}
        inputMode={isPhone ? "tel" : props.inputMode}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
