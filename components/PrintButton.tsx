"use client";

import { Button } from "./ui";

export function PrintButton({ label = "Baixar PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} variant="accent">
      ⬇ {label}
    </Button>
  );
}
