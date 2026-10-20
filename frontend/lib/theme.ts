import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

// Indigo brand scale (index 6 = primary in light mode, 4 in dark mode).
const brand: MantineColorsTuple = [
  "#eef0ff",
  "#dde1fd",
  "#b9c1f6",
  "#929ff0",
  "#7282eb",
  "#5d6fe8",
  "#4f62e6",
  "#4052cd",
  "#3748b8",
  "#2a3ca3",
];

// Slightly cooler, deeper dark palette than Mantine's default for a calmer dark mode.
const dark: MantineColorsTuple = [
  "#c9ccd6",
  "#a8acb9",
  "#868b9b",
  "#5c6170",
  "#3d4150",
  "#2c303c",
  "#20232d",
  "#171a22",
  "#12141b",
  "#0c0e13",
];

const fontStack = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand, dark },
  primaryShade: { light: 6, dark: 4 },
  fontFamily: fontStack,
  fontSizes: { xs: "0.75rem", sm: "0.875rem", md: "0.9375rem", lg: "1.0625rem", xl: "1.25rem" },
  headings: {
    fontFamily: fontStack,
    fontWeight: "650",
    sizes: {
      h1: { fontSize: "2.25rem", lineHeight: "1.2" },
      h2: { fontSize: "1.625rem", lineHeight: "1.25" },
      h3: { fontSize: "1.25rem", lineHeight: "1.3" },
      h4: { fontSize: "1.0625rem", lineHeight: "1.35" },
      h5: { fontSize: "0.9375rem", lineHeight: "1.4" },
    },
  },
  defaultRadius: "md",
  radius: { xs: "4px", sm: "6px", md: "8px", lg: "12px", xl: "16px" },
  shadows: {
    xs: "0 1px 2px rgba(16, 24, 40, 0.05)",
    sm: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
    md: "0 6px 16px -4px rgba(16, 24, 40, 0.1), 0 2px 6px -2px rgba(16, 24, 40, 0.05)",
    lg: "0 16px 32px -8px rgba(16, 24, 40, 0.14), 0 6px 12px -6px rgba(16, 24, 40, 0.06)",
  },
  cursorType: "pointer",
  focusRing: "auto",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg", padding: "lg", shadow: "xs" } },
    Paper: { defaultProps: { radius: "lg" } },
    Button: { defaultProps: { radius: "md" }, styles: { root: { fontWeight: 600 } } },
    ActionIcon: { defaultProps: { radius: "md" } },
    Badge: { defaultProps: { radius: "sm", tt: "none", fw: 600 } },
    Tooltip: { defaultProps: { withArrow: true, multiline: true, maw: 320, openDelay: 150 } },
    TextInput: { defaultProps: { radius: "md" } },
    PasswordInput: { defaultProps: { radius: "md" } },
    Textarea: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md", comboboxProps: { shadow: "md" } } },
    TagsInput: { defaultProps: { radius: "md" } },
    NumberInput: { defaultProps: { radius: "md" } },
    Modal: { defaultProps: { radius: "lg", centered: true, overlayProps: { backgroundOpacity: 0.45, blur: 2 } } },
    Menu: { defaultProps: { shadow: "md", radius: "md" } },
    Alert: { defaultProps: { radius: "md", variant: "light" } },
    Tabs: { defaultProps: { variant: "default" } },
    Progress: { defaultProps: { radius: "xl" } },
  },
});

/** App-level design tokens on top of Mantine's variables. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--app-header-height": "64px",
    "--app-content-max-width": "1280px",
  },
  light: {
    "--app-bg": "#f6f7fb",
    "--app-surface": "#ffffff",
    "--app-surface-muted": "#f9fafc",
    "--app-border": "#e6e8ef",
    "--app-text-muted": "#5f6577",
    "--app-brand-soft": "#eef0ff",
  },
  dark: {
    "--app-bg": "#0c0e13",
    "--app-surface": "#171a22",
    "--app-surface-muted": "#12141b",
    "--app-border": "#2c303c",
    "--app-text-muted": "#a8acb9",
    "--app-brand-soft": "rgba(93, 111, 232, 0.14)",
  },
});
