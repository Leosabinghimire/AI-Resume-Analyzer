"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import Link from "next/link";
import type { ReactNode } from "react";

interface IconActionProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Plain anchor (downloads, external links) instead of client-side navigation. */
  external?: boolean;
  color?: string;
  disabled?: boolean;
  /** Tooltip text when it should differ from the accessible label (e.g. why it is disabled). */
  tooltip?: string;
}

/** Icon-only button with a tooltip and an accessible name. */
export function IconAction({ label, icon, onClick, href, external, color = "gray", disabled, tooltip }: IconActionProps) {
  const common = { variant: "subtle" as const, color, "aria-label": label, disabled };
  let button: ReactNode;
  if (href && !disabled) {
    button = external ? (
      <ActionIcon {...common} component="a" href={href} target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
        {icon}
      </ActionIcon>
    ) : (
      <ActionIcon {...common} component={Link} href={href}>
        {icon}
      </ActionIcon>
    );
  } else {
    button = (
      <ActionIcon {...common} onClick={onClick}>
        {icon}
      </ActionIcon>
    );
  }
  return (
    <Tooltip label={tooltip ?? label} multiline={false}>
      {button}
    </Tooltip>
  );
}
