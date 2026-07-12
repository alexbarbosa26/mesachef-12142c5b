import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, onChange, onBeforeInput, ...props }, ref) => {
    // Normaliza campos numéricos para funcionar corretamente em mobile/tablet
    // (Chrome/Safari iOS/Android rejeitam vírgula com type="number"). Usamos
    // type="text" + inputMode="decimal" e convertemos vírgula -> ponto para
    // que parseFloat(e.target.value) continue funcionando em toda a base.
    const isNumeric = type === "number";
    const effectiveType = isNumeric ? "text" : type;
    const effectiveInputMode =
      inputMode ?? (isNumeric ? "decimal" : undefined);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumeric) {
        const raw = e.target.value;
        // aceita apenas dígitos, vírgula, ponto e sinal de menos
        const cleaned = raw.replace(/[^\d.,-]/g, "");
        // normaliza vírgula para ponto (formato aceito por parseFloat)
        const normalized = cleaned.replace(",", ".");
        if (normalized !== raw) {
          e.target.value = normalized;
        }
      }
      onChange?.(e);
    };

    return (
      <input
        type={effectiveType}
        inputMode={effectiveInputMode}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
