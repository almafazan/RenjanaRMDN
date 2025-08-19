import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { Tabs } from "expo-router";
import DailyPlansTab from "./components/DailyPlansTab";
import AchievementsTab from "./components/AchievementsTab";
import SpecialNotesTab from "./components/SpecialNotesTab";
import { Calendar, Award, BookOpen } from "lucide-react-native";

// Fixed width for mobile-first design
const MOBILE_WIDTH = 390;
const screenWidth = Dimensions.get("window").width;
const containerWidth = Math.min(screenWidth, MOBILE_WIDTH);

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("dailyPlans");

  const renderTabContent = () => {
    switch (activeTab) {
      case "dailyPlans":
        return <DailyPlansTab />;
      case "achievements":
        return <AchievementsTab />;
      case "specialNotes":
        return <SpecialNotesTab />;
      default:
        return <DailyPlansTab />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFEDF3] items-center">
      <StatusBar backgroundColor="#0ABAB5" barStyle="light-content" />

      {/* Fixed width container */}
      <View style={{ width: containerWidth }} className="flex-1">
        {/* Header */}
        <View className="bg-[#0ABAB5] p-4 shadow-md">
          <Text className="text-white text-2xl font-bold text-center">
            Renjana
          </Text>
        </View>

        {/* Main Content */}
        <View className="flex-1">{renderTabContent()}</View>

        {/* Bottom Navigation */}
        <View className="flex-row bg-white border-t border-gray-200">
          <TouchableOpacity
            className={`flex-1 py-4 items-center ${activeTab === "dailyPlans" ? "bg-[#ADEED9]" : "bg-white"}`}
            onPress={() => setActiveTab("dailyPlans")}
          >
            <Calendar
              size={24}
              color={activeTab === "dailyPlans" ? "#0ABAB5" : "#666"}
            />
            <Text
              className={`mt-1 text-xs ${activeTab === "dailyPlans" ? "text-[#0ABAB5] font-bold" : "text-gray-600"}`}
            >
              Rencana Harian
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-4 items-center ${activeTab === "achievements" ? "bg-[#ADEED9]" : "bg-white"}`}
            onPress={() => setActiveTab("achievements")}
          >
            <Award
              size={24}
              color={activeTab === "achievements" ? "#0ABAB5" : "#666"}
            />
            <Text
              className={`mt-1 text-xs ${activeTab === "achievements" ? "text-[#0ABAB5] font-bold" : "text-gray-600"}`}
            >
              Pencapaian
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-4 items-center ${activeTab === "specialNotes" ? "bg-[#ADEED9]" : "bg-white"}`}
            onPress={() => setActiveTab("specialNotes")}
          >
            <BookOpen
              size={24}
              color={activeTab === "specialNotes" ? "#0ABAB5" : "#666"}
            />
            <Text
              className={`mt-1 text-xs ${activeTab === "specialNotes" ? "text-[#0ABAB5] font-bold" : "text-gray-600"}`}
            >
              Catatan Khusus
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
