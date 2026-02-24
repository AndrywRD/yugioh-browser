"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ContextMenuPortalProps {
  children: ReactNode;
}

export function ContextMenuPortal({ children }: ContextMenuPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(<div className="pointer-events-none fixed inset-0 z-contextmenu">{children}</div>, document.body);
}

