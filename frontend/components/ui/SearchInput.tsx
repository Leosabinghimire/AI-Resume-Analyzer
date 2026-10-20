"use client";

import { CloseButton, TextInput, type TextInputProps } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

interface SearchInputProps extends Omit<TextInputProps, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search", label, ...rest }: SearchInputProps) {
  return (
    <TextInput
      label={label}
      aria-label={label ? undefined : placeholder}
      placeholder={placeholder}
      leftSection={<IconSearch size={16} />}
      rightSection={value ? <CloseButton size="sm" aria-label="Clear search" onClick={() => onChange("")} /> : null}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      {...rest}
    />
  );
}
