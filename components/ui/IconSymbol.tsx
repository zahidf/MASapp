import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, Text, View, type StyleProp, type TextStyle } from "react-native";

// Define our custom icon names that we use in the app
type CustomIconName =
  | "house.fill"
  | "paperplane.fill"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right"
  | "chevron.left"
  | "chevron.up"
  | "chevron.down"
  | "sunrise"
  | "sunset"
  | "moon.stars"
  | "sun.max"
  | "sun.max.fill"
  | "sun.min"
  | "bell"
  | "bell.fill"
  | "bell.slash"
  | "person.3"
  | "people"
  | "person"
  | "person.fill"
  | "person.badge.key"
  | "clock"
  | "clock.badge"
  | "gear"
  | "gear.circle"
  | "gear.circle.fill"
  | "info.circle"
  | "info.circle.fill"
  | "checkmark"
  | "checkmark.circle"
  | "checkmark.circle.fill"
  | "xmark"
  | "xmark.circle"
  | "exclamationmark.triangle"
  | "exclamationmark.triangle.fill"
  | "square.and.arrow.up"
  | "square.and.arrow.down"
  | "arrow.clockwise"
  | "arrow.left"
  | "arrow.right"
  | "arrow.left.square"
  | "arrow.right.square"
  | "doc.text"
  | "doc.text.fill"
  | "doc.on.doc"
  | "doc.text.magnifyingglass"
  | "folder"
  | "folder.fill"
  | "envelope"
  | "envelope.fill"
  | "phone"
  | "phone.fill"
  | "location"
  | "location.fill"
  | "globe"
  | "building.2"
  | "building.2.fill"
  | "house"
  | "calendar"
  | "heart"
  | "heart.fill"
  | "trash"
  | "trash.fill"
  | "hammer"
  | "wrench"
  | "wrench.fill"
  | "dot.radiowaves.left.and.right"
  | "wifi"
  | "cellular"
  | "ellipsis.circle"
  | "ellipsis.circle.fill"
  | "shield"
  | "lock.fill"
  | "calendar.badge.exclamationmark"
  | "clock.badge.checkmark"
  | "chart.line.uptrend.xyaxis"
  | "bell.badge"
  | "arrow.trianglehead.clockwise"
  | "doc.badge.plus"
  | "clock.fill"
  | "magnifyingglass"
  | "compass"
  | "compass.fill";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Mapping from our custom icon names to Material Icons
 */
const ICON_MAPPING: Record<CustomIconName, MaterialIconName> = {
  // Existing mappings
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.up": "expand-less",
  "chevron.down": "expand-more",

  // Prayer/Mosque related
  sunrise: "wb-sunny",
  sunset: "brightness-3",
  "moon.stars": "brightness-2",
  "sun.max": "wb-sunny",
  "sun.max.fill": "wb-sunny",
  "sun.min": "brightness-6",

  // Notification related
  bell: "notifications",
  "bell.fill": "notifications-active",
  "bell.slash": "notifications-off",

  // People/Community
  "person.3": "people",
  people: "people", // Using the valid "people" Material Icon
  person: "person",
  "person.fill": "person",
  "person.badge.key": "admin-panel-settings",

  // UI Elements
  clock: "access-time",
  "clock.badge": "schedule",
  gear: "settings",
  "gear.circle": "settings",
  "gear.circle.fill": "settings",
  "info.circle": "info",
  "info.circle.fill": "info",
  checkmark: "check",
  "checkmark.circle": "check-circle",
  "checkmark.circle.fill": "check-circle",
  xmark: "close",
  "xmark.circle": "cancel",
  "exclamationmark.triangle": "warning",
  "exclamationmark.triangle.fill": "warning",

  // Actions
  "square.and.arrow.up": "share",
  "square.and.arrow.down": "download",
  "arrow.clockwise": "refresh",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.left.square": "logout",
  "arrow.right.square": "login",

  // Documents/Files
  "doc.text": "description",
  "doc.text.fill": "description",
  "doc.on.doc": "content-copy",
  "doc.text.magnifyingglass": "find-in-page",
  folder: "folder",
  "folder.fill": "folder",

  // Communication
  envelope: "email",
  "envelope.fill": "email",
  phone: "phone",
  "phone.fill": "phone",

  // Location
  location: "place",
  "location.fill": "place",
  globe: "public",

  // Building/Structure
  "building.2": "business",
  "building.2.fill": "business",
  house: "home",

  // Media/Content
  calendar: "calendar-today",
  heart: "favorite-border",
  "heart.fill": "favorite",
  trash: "delete",
  "trash.fill": "delete",

  // Tools/Development
  hammer: "build",
  wrench: "build",
  "wrench.fill": "build",

  // Status indicators
  "dot.radiowaves.left.and.right": "radio",
  wifi: "wifi",
  cellular: "signal-cellular-4-bar",

  // Additional UI elements
  "ellipsis.circle": "more-horiz",
  "ellipsis.circle.fill": "more-horiz",
  shield: "security",
  
  // Admin icons
  "lock.fill": "lock",
  "calendar.badge.exclamationmark": "calendar-today",
  "clock.badge.checkmark": "schedule",
  "chart.line.uptrend.xyaxis": "analytics",
  "bell.badge": "notification-important",
  "arrow.trianglehead.clockwise": "sync",
  "doc.badge.plus": "note-add",
  "clock.fill": "access-time",
  magnifyingglass: "search",
  compass: "explore",
  "compass.fill": "explore",
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: CustomIconName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Special handling for people/jamah icon using FontAwesome6
  if (name === "people" || name === "person.3") {
    return (
      <FontAwesome6
        name="people-group"
        size={size}
        color={color}
        style={style}
      />
    );
  }

  const materialIconName = ICON_MAPPING[name];

  if (!materialIconName) {
    // No Material Icon mapping found for SF Symbol
    // Fallback to a question mark
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style as any]}>
        <Text style={{ fontSize: size * 0.8, color: color as string }}>
          ?
        </Text>
      </View>
    );
  }

  return (
    <MaterialIcons
      color={color}
      size={size}
      name={materialIconName}
      style={style}
    />
  );
}