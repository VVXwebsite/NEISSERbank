interface CurrencySymbolProps {
  className?: string;
  size?: number;
}

export function CurrencySymbol({ className = 'text-inherit inline-block', size = 16 }: CurrencySymbolProps) {
  return (
    <svg
      id="nsd-currency-symbol"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`align-middle ${className}`}
      aria-label="NSD (Neisser Dolar)"
    >
      {/* Letter N */}
      <path
        d="M5 19V5L19 19V5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3 Horizontal bars in the center like a currency mark */}
      <path
        d="M2.5 9.5H21.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 12H22"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M2.5 14.5H21.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FormatNSD({ amount, showFull = false, className = '' }: { amount: number; showFull?: boolean; className?: string }) {
  const formatted = amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: showFull ? 4 : 2,
  });

  return (
    <span className={`inline-flex items-center gap-1 font-mono tracking-tight ${className}`}>
      <span>{formatted}</span>
      <span className="font-semibold text-[0.85em] opacity-90">NSD</span>
    </span>
  );
}
