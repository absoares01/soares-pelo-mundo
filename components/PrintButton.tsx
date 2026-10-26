"use client";

import { Button } from "./ui";

export function PrintButton({ label = "Baixar em PDF / imprimir" }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
