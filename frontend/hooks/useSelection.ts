"use client";

import { useState } from "react";

/** A bounded multi-selection of ids (e.g. analyses to compare, jobs to match). */
export function useSelection(max: number, initial: string[] = []) {
  const [selected, setSelected] = useState<string[]>(initial);
  const isSelected = (id: string) => selected.includes(id);
  const isFull = selected.length >= max;
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < max ? [...prev, id] : prev));
  const remove = (id: string) => setSelected((prev) => prev.filter((x) => x !== id));
  return { selected, isSelected, isFull, toggle, remove, clear: () => setSelected([]) };
}
