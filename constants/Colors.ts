const tintColorLight = "#1B5E20"; // Deep green
const tintColorDark = "#81C784"; // Light green for dark mode

export const Colors = {
  light: {
    text: "#000000", // iOS system label color
    background: "#FFFFFF", // iOS system background
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    primary: "#1B5E20", // Deep green
    secondary: "#F9A825",
    surface: "#F5F5F5", // Light surface
    error: "#FF3B30", // iOS system red
    
    // iOS System Colors
    systemBackground: "#FFFFFF",
    secondarySystemBackground: "#F2F2F7",
    tertiarySystemBackground: "#FFFFFF",
    systemGroupedBackground: "#F2F2F7",
    secondarySystemGroupedBackground: "#FFFFFF",
    tertiarySystemGroupedBackground: "#F2F2F7",
    
    // Text Colors
    secondaryText: "#3C3C43" + "99", // 60% opacity
    tertiaryText: "#3C3C43" + "4D", // 30% opacity
    quaternaryText: "#3C3C43" + "2E", // 18% opacity
    placeholderText: "#3C3C43" + "4D", // 30% opacity
    
    // Separator Colors
    separator: "#3C3C43" + "36", // 21% opacity
    opaqueSeparator: "#C6C6C8",
    
    // System Colors
    systemRed: "#FF3B30",
    systemOrange: "#FF9500",
    systemYellow: "#FFCC00",
    systemGreen: "#34C759",
    systemMint: "#00C7BE",
    systemTeal: "#30B0C7",
    systemCyan: "#32ADE6",
    systemBlue: "#007AFF",
    systemIndigo: "#5856D6",
    systemPurple: "#AF52DE",
    systemPink: "#FF2D55",
    systemBrown: "#A2845E",
    
    // Gray Colors
    systemGray: "#8E8E93",
    systemGray2: "#AEAEB2",
    systemGray3: "#C7C7CC",
    systemGray4: "#D1D1D6",
    systemGray5: "#E5E5EA",
    systemGray6: "#F2F2F7",
    
    // Other
    link: "#007AFF",
    notification: "#FF9500",
  },
  dark: {
    text: "#FFFFFF", // iOS system label color (dark)
    background: "#000000", // iOS system background (dark)
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    primary: "#0A84FF", // iOS system blue (dark)
    secondary: "#FFD54F",
    surface: "#2A2A2A", // Dark surface
    error: "#FF453A", // iOS system red (dark)
    
    // iOS System Colors (Dark Mode)
    systemBackground: "#000000",
    secondarySystemBackground: "#1C1C1E",
    tertiarySystemBackground: "#2C2C2E",
    systemGroupedBackground: "#000000",
    secondarySystemGroupedBackground: "#1C1C1E",
    tertiarySystemGroupedBackground: "#2C2C2E",
    
    // Text Colors (Dark Mode)
    secondaryText: "#EBEBF5" + "99", // 60% opacity
    tertiaryText: "#EBEBF5" + "4D", // 30% opacity
    quaternaryText: "#EBEBF5" + "29", // 16% opacity
    placeholderText: "#EBEBF5" + "4D", // 30% opacity
    
    // Separator Colors (Dark Mode)
    separator: "#545458" + "65", // 40% opacity
    opaqueSeparator: "#38383A",
    
    // System Colors (Dark Mode)
    systemRed: "#FF453A",
    systemOrange: "#FF9F0A",
    systemYellow: "#FFD60A",
    systemGreen: "#32D74B",
    systemMint: "#66D4CF",
    systemTeal: "#64D2FF",
    systemCyan: "#64D2FF",
    systemBlue: "#0A84FF",
    systemIndigo: "#5E5CE6",
    systemPurple: "#BF5AF2",
    systemPink: "#FF375F",
    systemBrown: "#AC8E68",
    
    // Gray Colors (Dark Mode)
    systemGray: "#8E8E93",
    systemGray2: "#636366",
    systemGray3: "#48484A",
    systemGray4: "#3A3A3C",
    systemGray5: "#2C2C2E",
    systemGray6: "#1C1C1E",
    
    // Other
    link: "#0A84FF",
    notification: "#FF9F0A",
  },
};