"use client";

import { useDebouncedValue } from "@mantine/hooks";
import { useState } from "react";

/** Search text (debounced for queries) and page number for paginated lists; searching resets the page. */
export function useListParams(initialSearch = "") {
  const [search, setSearchValue] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search.trim(), 300);

  const setSearch = (value: string) => {
    setSearchValue(value);
    setPage(1);
  };

  return { search, setSearch, debouncedSearch, page, setPage, resetPage: () => setPage(1) };
}
