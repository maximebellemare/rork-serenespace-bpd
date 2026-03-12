import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function CompanionLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
