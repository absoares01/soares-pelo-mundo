"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ProposalItem } from "@/lib/types";

// "Cesta" de opções escolhidas para a proposta/comparação (guardada no navegador).
const KEY = "spm-cart-v1";
const MAX = 10;

interface CartValue {
  items: ProposalItem[];
  add: (item: ProposalItem) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const Ctx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as ProposalItem[]);
    } catch {
      /* ignora */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignora */
    }
  }, [items, loaded]);

  const add = useCallback((item: ProposalItem) => {
    let added = false;
    setItems((cur) => {
      if (cur.some((i) => i.id === item.id) || cur.length >= MAX) return cur;
      added = true;
      return [...cur, item];
    });
    return added;
  }, []);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const value = useMemo(() => ({ items, add, remove, clear, has }), [items, add, remove, clear, has]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart deve ser usado dentro de CartProvider");
  return v;
}
