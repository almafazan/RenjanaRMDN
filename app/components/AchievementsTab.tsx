import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import {
  ChevronDown,
  Plus,
  Award,
  Calendar,
  BarChart3,
  X,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import {
  Achievement,
  offlineOperations,
  checkConnectivity,
  syncWithSupabase,
} from "../../lib/supabase";

// Conditionally import ads only for native platforms
let InterstitialAd: any = null;
let AdEventType: any = null;
let TestIds: any = null;

if (Platform.OS !== "web") {
  try {
    const ads = require("react-native-google-mobile-ads");
    InterstitialAd = ads.InterstitialAd;
    AdEventType = ads.AdEventType;
    TestIds = ads.TestIds;
  } catch (error) {
    console.warn("Google Mobile Ads not available:", error);
  }
}

type AchievementsTabProps = {
  achievements?: Achievement[];
};

// Demo Interstitial Ad ID (use your real ad unit ID in production)
const adUnitId = __DEV__
  ? TestIds?.INTERSTITIAL || "ca-app-pub-3940256099942544/1033173712"
  : "ca-app-pub-3940256099942544/1033173712";

const interstitialAd = InterstitialAd
  ? InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    })
  : null;

const AchievementsTab = ({}: AchievementsTabProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeView, setActiveView] = useState<"daily" | "monthly" | "yearly">(
    "daily",
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Partial<Achievement>>({
    title: "",
    progress: 0,
    status: "planned",
  });
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [interstitialAdLoaded, setInterstitialAdLoaded] = useState(false);

  // Load achievements and check connectivity
  useEffect(() => {
    loadAchievements();
    checkConnectionStatus();
    loadInterstitialAd();
  }, []);

  // Load interstitial ad
  const loadInterstitialAd = () => {
    if (!interstitialAd || !AdEventType) {
      return () => {};
    }

    const unsubscribeLoaded = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setInterstitialAdLoaded(true);
      },
    );

    const unsubscribeClosed = interstitialAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setInterstitialAdLoaded(false);
        interstitialAd.load();
      },
    );

    interstitialAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  };

  const showInterstitialAd = () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Ads not available",
        "Ads are not supported on web platform.",
      );
      return;
    }

    if (interstitialAdLoaded && interstitialAd) {
      interstitialAd.show();
    } else {
      Alert.alert("Ad not ready", "Please wait for the ad to load.");
    }
  };

  const checkConnectionStatus = async () => {
    const online = await checkConnectivity();
    setIsOnline(online);
  };

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const data = await offlineOperations.achievements.getAll();
      setAchievements(data);
    } catch (error) {
      console.error("Error loading achievements:", error);
      Alert.alert("Error", "Gagal memuat pencapaian");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const success = await syncWithSupabase();
      if (success) {
        await loadAchievements();
        Alert.alert("Sukses", "Data berhasil disinkronkan");
      } else {
        Alert.alert("Error", "Tidak dapat terhubung ke server");
      }
    } catch (error) {
      Alert.alert("Error", "Gagal melakukan sinkronisasi");
    } finally {
      setSyncing(false);
      await checkConnectionStatus();
    }
  };

  const getFilteredAchievements = () => {
    // In a real app, this would filter based on the active view
    return achievements;
  };

  const renderProgressBar = (progress: number) => {
    return (
      <View className="w-full h-2 bg-[#ADEED9] rounded-full overflow-hidden">
        <View
          className="h-full bg-[#0ABAB5] rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
    );
  };

  const renderStatusBadge = (status: Achievement["status"]) => {
    const statusColors = {
      completed: "bg-[#0ABAB5] text-white",
      "in-progress": "bg-[#56DFCF] text-white",
      planned: "bg-[#FFEDF3] text-[#0ABAB5]",
    };

    return (
      <View className={`px-2 py-1 rounded-full ${statusColors[status]}`}>
        <Text className="text-xs font-medium">
          {status === "completed"
            ? "Selesai"
            : status === "in-progress"
              ? "Sedang Berjalan"
              : "Direncanakan"}
        </Text>
      </View>
    );
  };

  const handleAddAchievement = async () => {
    if (!newAchievement.title || !newAchievement.date) {
      Alert.alert("Error", "Harap isi judul dan tanggal");
      return;
    }

    setLoading(true);
    try {
      const achievementData = {
        title: newAchievement.title!,
        date: newAchievement.date!,
        progress: newAchievement.progress || 0,
        status: newAchievement.status || ("planned" as const),
      };

      const createdAchievement =
        await offlineOperations.achievements.create(achievementData);
      setAchievements([createdAchievement, ...achievements]);
      setNewAchievement({ title: "", progress: 0, status: "planned" });
      setShowAddForm(false);

      const message = isOnline
        ? "Pencapaian berhasil ditambahkan dan disinkronkan"
        : "Pencapaian berhasil ditambahkan (akan disinkronkan saat online)";
      Alert.alert("Sukses", message);
    } catch (error) {
      console.error("Error adding achievement:", error);
      Alert.alert("Error", "Gagal menambahkan pencapaian");
    } finally {
      setLoading(false);
      await checkConnectionStatus();
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      {/* Header with connectivity status */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Text className="text-xl font-bold text-[#0ABAB5] mr-2">
            Pencapaian
          </Text>
          <View className="flex-row items-center">
            {isOnline ? (
              <Wifi size={14} color="#0ABAB5" />
            ) : (
              <WifiOff size={14} color="#FF6B6B" />
            )}
            <Text
              className={`text-xs ml-1 ${isOnline ? "text-[#0ABAB5]" : "text-[#FF6B6B]"}`}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          {!isOnline && (
            <TouchableOpacity
              onPress={handleSync}
              className="bg-[#56DFCF] px-2 py-1 rounded-full mr-2"
              disabled={syncing}
            >
              <Text className="text-white text-xs">
                {syncing ? "Sync..." : "Sync"}
              </Text>
            </TouchableOpacity>
          )}
          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={showInterstitialAd}
              className="bg-[#FF6B6B] px-2 py-1 rounded-full"
              disabled={!interstitialAdLoaded}
            >
              <Text className="text-white text-xs">
                {interstitialAdLoaded ? "Show Ad" : "Loading..."}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View Toggle */}
      <View className="flex-row justify-between mb-4 bg-[#ADEED9] rounded-lg overflow-hidden">
        <TouchableOpacity
          className={`flex-1 py-2 px-2 flex-row items-center justify-center ${activeView === "daily" ? "bg-[#0ABAB5]" : ""}`}
          onPress={() => setActiveView("daily")}
        >
          <Calendar
            size={14}
            color={activeView === "daily" ? "#FFFFFF" : "#0ABAB5"}
          />
          <Text
            className={`ml-1 font-medium text-xs ${activeView === "daily" ? "text-white" : "text-[#0ABAB5]"}`}
          >
            Harian
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-2 px-2 flex-row items-center justify-center ${activeView === "monthly" ? "bg-[#0ABAB5]" : ""}`}
          onPress={() => setActiveView("monthly")}
        >
          <Calendar
            size={14}
            color={activeView === "monthly" ? "#FFFFFF" : "#0ABAB5"}
          />
          <Text
            className={`ml-1 font-medium text-xs ${activeView === "monthly" ? "text-white" : "text-[#0ABAB5]"}`}
          >
            Bulanan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-2 px-2 flex-row items-center justify-center ${activeView === "yearly" ? "bg-[#0ABAB5]" : ""}`}
          onPress={() => setActiveView("yearly")}
        >
          <BarChart3
            size={14}
            color={activeView === "yearly" ? "#FFFFFF" : "#0ABAB5"}
          />
          <Text
            className={`ml-1 font-medium text-xs ${activeView === "yearly" ? "text-white" : "text-[#0ABAB5]"}`}
          >
            Tahunan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View className="flex-row justify-between mb-4">
        <View className="bg-[#FFEDF3] p-2 rounded-lg flex-1 mr-1 items-center">
          <Text className="text-[#0ABAB5] font-bold text-base">
            {achievements.filter((a) => a.status === "completed").length}
          </Text>
          <Text className="text-[#0ABAB5] text-xs">Selesai</Text>
        </View>
        <View className="bg-[#FFEDF3] p-2 rounded-lg flex-1 mx-1 items-center">
          <Text className="text-[#0ABAB5] font-bold text-base">
            {achievements.filter((a) => a.status === "in-progress").length}
          </Text>
          <Text className="text-[#0ABAB5] text-xs">Berjalan</Text>
        </View>
        <View className="bg-[#FFEDF3] p-2 rounded-lg flex-1 ml-1 items-center">
          <Text className="text-[#0ABAB5] font-bold text-base">
            {achievements.filter((a) => a.status === "planned").length}
          </Text>
          <Text className="text-[#0ABAB5] text-xs">Rencana</Text>
        </View>
      </View>

      {/* Add Achievement Button */}
      <TouchableOpacity
        className="bg-[#0ABAB5] py-3 px-4 rounded-lg flex-row items-center justify-center mb-4"
        onPress={() => setShowAddForm(!showAddForm)}
      >
        <Plus size={18} color="#FFFFFF" />
        <Text className="text-white font-medium ml-2">Tambah Pencapaian</Text>
      </TouchableOpacity>

      {/* Add Achievement Form */}
      <Modal visible={showAddForm} transparent={true} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-5/6 rounded-lg p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-[#0ABAB5]">
                Tambah Pencapaian Baru
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(false)}>
                <X size={24} color="#0ABAB5" />
              </TouchableOpacity>
            </View>

            <Text className="font-medium text-gray-700 mb-1">Judul:</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-3"
              value={newAchievement.title || ""}
              onChangeText={(text) =>
                setNewAchievement({ ...newAchievement, title: text })
              }
              placeholder="Masukkan judul pencapaian"
            />

            <Text className="font-medium text-gray-700 mb-1">Tanggal:</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-3"
              value={newAchievement.date || ""}
              onChangeText={(text) =>
                setNewAchievement({ ...newAchievement, date: text })
              }
              placeholder="YYYY-MM-DD"
            />

            <Text className="font-medium text-gray-700 mb-1">
              Progress (0-100):
            </Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-3"
              value={newAchievement.progress?.toString() || "0"}
              onChangeText={(text) =>
                setNewAchievement({
                  ...newAchievement,
                  progress: parseInt(text) || 0,
                })
              }
              placeholder="0"
              keyboardType="numeric"
            />

            <TouchableOpacity
              onPress={handleAddAchievement}
              className="bg-[#0ABAB5] py-3 rounded-md items-center"
              disabled={loading}
            >
              <Text className="text-white font-bold">
                {loading ? "Menyimpan..." : "Simpan Pencapaian"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Achievements List */}
      <Text className="text-lg font-bold mb-2 text-[#0ABAB5]">
        {activeView === "daily"
          ? "Pencapaian Harian"
          : activeView === "monthly"
            ? "Ringkasan Bulanan"
            : "Ikhtisar Tahunan"}
      </Text>

      <ScrollView className="flex-1">
        {getFilteredAchievements().map((achievement) => (
          <View
            key={achievement.id}
            className="bg-[#FFEDF3] p-4 rounded-lg mb-3"
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="font-bold text-[#0ABAB5]">
                  {achievement.title}
                </Text>
                <Text className="text-xs text-gray-500">
                  {achievement.date}
                </Text>
              </View>
              {renderStatusBadge(achievement.status)}
            </View>

            <View className="flex-row items-center mb-1">
              <Text className="text-xs text-gray-500 mr-2">Kemajuan:</Text>
              <Text className="text-xs font-medium">
                {achievement.progress}%
              </Text>
            </View>
            {renderProgressBar(achievement.progress)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default AchievementsTab;
