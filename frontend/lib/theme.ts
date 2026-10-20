import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#eef3ff",
  "#dce4f5",
  "#b9c7e2",
  "#94a8d0",
  "#748dc1",
  "#5f7cb8",
  "#5474b4",
  "#44639f",
  "#39588f",
  "#2d4b81",
];

export const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  primaryShade: { light: 7, dark: 5 },
  fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headings: { fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "md", padding: "lg" } },
    Paper: { defaultProps: { radius: "md" } },
    Tooltip: { defaultProps: { withArrow: true, multiline: true, maw: 320 } },
    Badge: { defaultProps: { radius: "sm" } },
  },
});
