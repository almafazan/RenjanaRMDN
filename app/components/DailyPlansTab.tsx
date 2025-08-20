import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { PlusCircle, Edit, X, Check, Wifi, WifiOff } from "lucide-react-native";
import {
  DailyPlan,
  offlineOperations,
  checkConnectivity,
  syncWithSupabase,
} from "../../lib/supabase";

// Conditionally import ads only for native platforms
let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

if (Platform.OS !== "web") {
  try {
    const ads = require("react-native-google-mobile-ads");
    RewardedAd = ads.RewardedAd;
    RewardedAdEventType = ads.RewardedAdEventType;
    TestIds = ads.TestIds;
  } catch (error) {
    console.warn("Google Mobile Ads not available:", error);
  }
}

interface DailyPlansTabProps {
  plans?: DailyPlan[];
  onAddPlan?: (plan: Omit<DailyPlan, "id">) => void;
  onEditPlan?: (plan: DailyPlan) => void;
}

// Demo Rewarded Ad ID (use your real ad unit ID in production)
const adUnitId = __DEV__
  ? TestIds?.REWARDED || "ca-app-pub-3940256099942544/5224354917"
  : "ca-app-pub-3940256099942544/5224354917";

const rewardedAd = RewardedAd
  ? RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    })
  : null;

export default function DailyPlansTab({
  onAddPlan = () => {},
  onEditPlan = () => {},
}: DailyPlansTabProps) {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(null);
  const [newPlan, setNewPlan] = useState<Omit<DailyPlan, "id">>({
    day: "",
    date: "",
    notes: "",
    targets: "",
  });
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rewardedAdLoaded, setRewardedAdLoaded] = useState(false);

  // Load plans and check connectivity
  useEffect(() => {
    loadPlans();
    checkConnectionStatus();
    loadRewardedAd();
  }, []);

  // Load rewarded ad
  const loadRewardedAd = () => {
    if (!rewardedAd || !RewardedAdEventType) {
      return () => {};
    }

    const unsubscribeLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setRewardedAdLoaded(true);
      },
    );

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log("User earned reward of ", reward);
        Alert.alert(
          "Reward Earned!",
          `You earned ${reward.amount} ${reward.type}`,
        );
        setRewardedAdLoaded(false);
        rewardedAd.load();
      },
    );

    rewardedAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  };

  const showRewardedAd = () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Ads not available",
        "Ads are not supported on web platform.",
      );
      return;
    }

    if (rewardedAdLoaded && rewardedAd) {
      rewardedAd.show();
    } else {
      Alert.alert("Ad not ready", "Please wait for the ad to load.");
    }
  };

  const checkConnectionStatus = async () => {
    const online = await checkConnectivity();
    setIsOnline(online);
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await offlineOperations.dailyPlans.getAll();
      setPlans(data);
    } catch (error) {
      console.error("Error loading plans:", error);
      Alert.alert("Error", "Gagal memuat rencana harian");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const success = await syncWithSupabase();
      if (success) {
        await loadPlans();
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

  const handleAddPlan = async () => {
    if (!newPlan.day || !newPlan.date) {
      Alert.alert("Error", "Harap isi hari dan tanggal");
      return;
    }

    setLoading(true);
    try {
      const createdPlan = await offlineOperations.dailyPlans.create(newPlan);
      setPlans([createdPlan, ...plans]);
      onAddPlan(newPlan);
      setNewPlan({ day: "", date: "", notes: "", targets: "" });
      setIsAddModalVisible(false);

      const message = isOnline
        ? "Rencana berhasil ditambahkan dan disinkronkan"
        : "Rencana berhasil ditambahkan (akan disinkronkan saat online)";
      Alert.alert("Sukses", message);
    } catch (error) {
      console.error("Error adding plan:", error);
      Alert.alert("Error", "Gagal menambahkan rencana");
    } finally {
      setLoading(false);
      await checkConnectionStatus();
    }
  };

  const handleEditPlan = async () => {
    if (!currentPlan) return;

    setLoading(true);
    try {
      await offlineOperations.dailyPlans.update(currentPlan);

      const updatedPlans = plans.map((plan) =>
        plan.id === currentPlan.id ? currentPlan : plan,
      );
      setPlans(updatedPlans);
      onEditPlan(currentPlan);
      setIsEditModalVisible(false);
      setCurrentPlan(null);

      const message = isOnline
        ? "Rencana berhasil diperbarui dan disinkronkan"
        : "Rencana berhasil diperbarui (akan disinkronkan saat online)";
      Alert.alert("Sukses", message);
    } catch (error) {
      console.error("Error updating plan:", error);
      Alert.alert("Error", "Gagal memperbarui rencana");
    } finally {
      setLoading(false);
      await checkConnectionStatus();
    }
  };

  const openEditModal = (plan: DailyPlan) => {
    setCurrentPlan(plan);
    setIsEditModalVisible(true);
  };

  return (
    <View className="flex-1 bg-[#ADEED9] p-4">
      {/* Header with connectivity status */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Text className="text-xl font-bold text-[#0ABAB5] mr-2">
            Rencana Harian
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
              onPress={showRewardedAd}
              className="bg-[#FF6B6B] px-2 py-1 rounded-full mr-2"
              disabled={!rewardedAdLoaded}
            >
              <Text className="text-white text-xs">
                {rewardedAdLoaded ? "Watch Ad" : "Loading..."}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setIsAddModalVisible(true)}
            className="bg-[#0ABAB5] p-2 rounded-full"
          >
            <PlusCircle size={20} color="#FFEDF3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Header */}
      <View className="flex-row bg-[#56DFCF] p-2 rounded-t-lg">
        <Text className="flex-1 font-bold text-white text-xs">Hari</Text>
        <Text className="flex-1 font-bold text-white text-xs">Tanggal</Text>
        <Text className="flex-2 font-bold text-white text-xs">Catatan</Text>
        <Text className="flex-2 font-bold text-white text-xs">Target</Text>
        <Text className="w-8 font-bold text-white text-xs">Edit</Text>
      </View>

      {/* Table Content */}
      <ScrollView className="flex-1 bg-white rounded-b-lg">
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            onPress={() => openEditModal(plan)}
            className="flex-row border-b border-gray-200 p-2 items-center"
          >
            <Text className="flex-1 text-gray-800 text-xs">{plan.day}</Text>
            <Text className="flex-1 text-gray-800 text-xs">{plan.date}</Text>
            <Text className="flex-2 text-gray-800 text-xs" numberOfLines={2}>
              {plan.notes}
            </Text>
            <Text className="flex-2 text-gray-800 text-xs" numberOfLines={2}>
              {plan.targets}
            </Text>
            <TouchableOpacity
              onPress={() => openEditModal(plan)}
              className="w-8 items-center"
            >
              <Edit size={16} color="#0ABAB5" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Plan Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-5/6 rounded-lg p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-[#0ABAB5]">
                Tambah Rencana Baru
              </Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <X size={24} color="#0ABAB5" />
              </TouchableOpacity>
            </View>

            <Text className="font-medium text-gray-700 mb-1">Hari:</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-3"
              value={newPlan.day}
              onChangeText={(text) => setNewPlan({ ...newPlan, day: text })}
              placeholder="contoh: Senin"
            />

            <Text className="font-medium text-gray-700 mb-1">Tanggal:</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-3"
              value={newPlan.date}
              onChangeText={(text) => setNewPlan({ ...newPlan, date: text })}
              placeholder="YYYY-MM-DD"
            />

            <Text className="font-medium text-gray-700 mb-1">Catatan:</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-3"
              value={newPlan.notes}
              onChangeText={(text) => setNewPlan({ ...newPlan, notes: text })}
              placeholder="Masukkan catatan"
              multiline
            />

            <Text className="font-medium text-gray-700 mb-1">Target:</Text>
            <TextInput
              className="border border-gray-300 rounded-md p-2 mb-4"
              value={newPlan.targets}
              onChangeText={(text) => setNewPlan({ ...newPlan, targets: text })}
              placeholder="Masukkan target"
              multiline
            />

            <TouchableOpacity
              onPress={handleAddPlan}
              className="bg-[#0ABAB5] py-3 rounded-md items-center"
              disabled={loading}
            >
              <Text className="text-white font-bold">
                {loading ? "Menyimpan..." : "Simpan Rencana"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-5/6 rounded-lg p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-[#0ABAB5]">
                Edit Rencana
              </Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <X size={24} color="#0ABAB5" />
              </TouchableOpacity>
            </View>

            {currentPlan && (
              <>
                <Text className="font-medium text-gray-700 mb-1">Hari:</Text>
                <TextInput
                  className="border border-gray-300 rounded-md p-2 mb-3"
                  value={currentPlan.day}
                  onChangeText={(text) =>
                    setCurrentPlan({ ...currentPlan, day: text })
                  }
                />

                <Text className="font-medium text-gray-700 mb-1">Tanggal:</Text>
                <TextInput
                  className="border border-gray-300 rounded-md p-2 mb-3"
                  value={currentPlan.date}
                  onChangeText={(text) =>
                    setCurrentPlan({ ...currentPlan, date: text })
                  }
                />

                <Text className="font-medium text-gray-700 mb-1">Catatan:</Text>
                <TextInput
                  className="border border-gray-300 rounded-md p-2 mb-3"
                  value={currentPlan.notes}
                  onChangeText={(text) =>
                    setCurrentPlan({ ...currentPlan, notes: text })
                  }
                  multiline
                />

                <Text className="font-medium text-gray-700 mb-1">Target:</Text>
                <TextInput
                  className="border border-gray-300 rounded-md p-2 mb-4"
                  value={currentPlan.targets}
                  onChangeText={(text) =>
                    setCurrentPlan({ ...currentPlan, targets: text })
                  }
                  multiline
                />

                <TouchableOpacity
                  onPress={handleEditPlan}
                  className="bg-[#0ABAB5] py-3 rounded-md items-center"
                  disabled={loading}
                >
                  <Text className="text-white font-bold">
                    {loading ? "Menyimpan..." : "Simpan Perubahan"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
