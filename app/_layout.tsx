import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-url-polyfill/auto";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
