"use client";

import { useEffect, useState } from "react";
import { centsToInput, parseMoneyInput } from "@/lib/format";
import { inputCls } from "./ui";

// Campo de valor em reais ("1.234,56"). O valor externo é sempre em centavos.
export function MoneyInput({
  cents,
  onChange,
  className,
  placeholder,
  ariaLabel,
}: {
  cents: number;
  onChange: (cents: number) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(centsToInput(cents));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(centsToInput(cents));
  }, [cents, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      className={className ?? inputCls}
      placeholder={placeholder ?? "0,00"}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(centsToInput(parseMoneyInput(text)));
      }}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseMoneyInput(e.target.value));
      }}
    />
  );
}
