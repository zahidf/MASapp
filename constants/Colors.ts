const tintColorLight = "#1B5E20"; // Deep green
const tintColorDark = "#81C784"; // Light green for dark mode

export const Colors = {
  light: {
    text: "#212121", // Dark text on light background
    background: "#FFFFFF", // Light background
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    primary: "#1B5E20",
    secondary: "#F9A825",
    surface: "#F5F5F5", // Light surface
    error: "#D32F2F",
  },
  dark: {
    text: "#ECEDEE", // Light text on dark background
    background: "#151718", // Dark background
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    primary: "#81C784", // Lighter green for dark mode
    secondary: "#FFD54F",
    surface: "#2A2A2A", // Dark surface
    error: "#EF5350",
  },
};
