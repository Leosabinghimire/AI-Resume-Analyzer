import {
  IconBriefcase,
  IconFileText,
  IconHistory,
  IconLayoutDashboard,
  IconMessageQuestion,
  IconSettings,
  IconTargetArrow,
  type Icon,
} from "@tabler/icons-react";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Custom active matcher; defaults to "pathname starts with href". */
  match?: (pathname: string) => boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
      { href: "/resumes", label: "Resumes", icon: IconFileText },
      { href: "/jobs", label: "Job descriptions", icon: IconBriefcase },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/analyses/new", label: "Match resume", icon: IconTargetArrow },
      {
        href: "/analyses",
        label: "Analysis history",
        icon: IconHistory,
        match: (p) => p === "/analyses" || /^\/analyses\/(?!new)/.test(p),
      },
      { href: "/interview-prep", label: "Interview prep", icon: IconMessageQuestion },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: IconSettings }],
  },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  return item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Links in the public (signed-out) header and footer. */
export const PUBLIC_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/features#scoring", label: "How scoring works" },
  { href: "/privacy", label: "Privacy" },
];
