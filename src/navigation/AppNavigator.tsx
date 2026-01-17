import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CoffeeScannerScreen from "../screens/CoffeeScannerScreen";
import HomeScreen from "../screens/HomeScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitle: "BrewMate",
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="CoffeeScanner"
          component={CoffeeScannerScreen}
          options={{
            headerTitle: "Coffee Scanner",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
