import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DailyPlan {
  id: string;
  day: string;
  date: string;
  notes: string;
  targets: string;
  created_at?: string;
  updated_at?: string;
}

export interface Achievement {
  id: string;
  title: string;
  date: string;
  progress: number;
  status: "completed" | "in-progress" | "planned";
  created_at?: string;
  updated_at?: string;
}

export interface SpecialNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Local storage keys
const STORAGE_KEYS = {
  DAILY_PLANS: "daily_plans",
  ACHIEVEMENTS: "achievements",
  SPECIAL_NOTES: "special_notes",
  PENDING_SYNC: "pending_sync",
  LAST_SYNC: "last_sync",
};

// Sync queue types
interface SyncOperation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data?: any;
  timestamp: string;
}

// Check internet connectivity
export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("daily_plans")
      .select("id")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
};

// Local storage functions
export const saveToLocal = async <T>(key: string, data: T[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving to local storage:", error);
  }
};

export const getFromLocal = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting from local storage:", error);
    return [];
  }
};

// Sync queue functions
const addToSyncQueue = async (
  operation: Omit<SyncOperation, "id" | "timestamp">,
): Promise<void> => {
  try {
    const queue = await getFromLocal<SyncOperation>(STORAGE_KEYS.PENDING_SYNC);
    const newOperation: SyncOperation = {
      ...operation,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    queue.push(newOperation);
    await saveToLocal(STORAGE_KEYS.PENDING_SYNC, queue);
  } catch (error) {
    console.error("Error adding to sync queue:", error);
  }
};

const processSyncQueue = async (): Promise<void> => {
  try {
    const queue = await getFromLocal<SyncOperation>(STORAGE_KEYS.PENDING_SYNC);
    const processedIds: string[] = [];

    for (const operation of queue) {
      try {
        let success = false;

        switch (operation.operation) {
          case "insert":
            const { error: insertError } = await supabase
              .from(operation.table)
              .insert([operation.data]);
            success = !insertError;
            break;

          case "update":
            const { error: updateError } = await supabase
              .from(operation.table)
              .update(operation.data)
              .eq("id", operation.data.id);
            success = !updateError;
            break;

          case "delete":
            const { error: deleteError } = await supabase
              .from(operation.table)
              .delete()
              .eq("id", operation.data.id);
            success = !deleteError;
            break;
        }

        if (success) {
          processedIds.push(operation.id);
        }
      } catch (error) {
        console.error("Error processing sync operation:", error);
      }
    }

    // Remove processed operations from queue
    const remainingQueue = queue.filter((op) => !processedIds.includes(op.id));
    await saveToLocal(STORAGE_KEYS.PENDING_SYNC, remainingQueue);

    if (processedIds.length > 0) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString(),
      );
    }
  } catch (error) {
    console.error("Error processing sync queue:", error);
  }
};

// Enhanced CRUD operations with offline support
export const offlineOperations = {
  // Daily Plans
  dailyPlans: {
    getAll: async (): Promise<DailyPlan[]> => {
      const isOnline = await checkConnectivity();

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from("daily_plans")
            .select("*")
            .order("date", { ascending: false });

          if (!error && data) {
            await saveToLocal(STORAGE_KEYS.DAILY_PLANS, data);
            await processSyncQueue();
            return data;
          }
        } catch (error) {
          console.error("Error fetching from Supabase:", error);
        }
      }

      return await getFromLocal<DailyPlan>(STORAGE_KEYS.DAILY_PLANS);
    },

    create: async (plan: Omit<DailyPlan, "id">): Promise<DailyPlan> => {
      const newPlan: DailyPlan = {
        ...plan,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save locally first
      const localPlans = await getFromLocal<DailyPlan>(
        STORAGE_KEYS.DAILY_PLANS,
      );
      localPlans.unshift(newPlan);
      await saveToLocal(STORAGE_KEYS.DAILY_PLANS, localPlans);

      const isOnline = await checkConnectivity();
      if (isOnline) {
        try {
          const { error } = await supabase
            .from("daily_plans")
            .insert([newPlan]);
          if (error) throw error;
        } catch (error) {
          await addToSyncQueue({
            table: "daily_plans",
            operation: "insert",
            data: newPlan,
          });
        }
      } else {
        await addToSyncQueue({
          table: "daily_plans",
          operation: "insert",
          data: newPlan,
        });
      }

      return newPlan;
    },

    update: async (plan: DailyPlan): Promise<void> => {
      const updatedPlan = { ...plan, updated_at: new Date().toISOString() };

      // Update locally first
      const localPlans = await getFromLocal<DailyPlan>(
        STORAGE_KEYS.DAILY_PLANS,
      );
      const index = localPlans.findIndex((p) => p.id === plan.id);
      if (index !== -1) {
        localPlans[index] = updatedPlan;
        await saveToLocal(STORAGE_KEYS.DAILY_PLANS, localPlans);
      }

      const isOnline = await checkConnectivity();
      if (isOnline) {
        try {
          const { error } = await supabase
            .from("daily_plans")
            .update(updatedPlan)
            .eq("id", plan.id);
          if (error) throw error;
        } catch (error) {
          await addToSyncQueue({
            table: "daily_plans",
            operation: "update",
            data: updatedPlan,
          });
        }
      } else {
        await addToSyncQueue({
          table: "daily_plans",
          operation: "update",
          data: updatedPlan,
        });
      }
    },
  },

  // Achievements
  achievements: {
    getAll: async (): Promise<Achievement[]> => {
      const isOnline = await checkConnectivity();

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from("achievements")
            .select("*")
            .order("date", { ascending: false });

          if (!error && data) {
            await saveToLocal(STORAGE_KEYS.ACHIEVEMENTS, data);
            await processSyncQueue();
            return data;
          }
        } catch (error) {
          console.error("Error fetching from Supabase:", error);
        }
      }

      return await getFromLocal<Achievement>(STORAGE_KEYS.ACHIEVEMENTS);
    },

    create: async (
      achievement: Omit<Achievement, "id">,
    ): Promise<Achievement> => {
      const newAchievement: Achievement = {
        ...achievement,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save locally first
      const localAchievements = await getFromLocal<Achievement>(
        STORAGE_KEYS.ACHIEVEMENTS,
      );
      localAchievements.unshift(newAchievement);
      await saveToLocal(STORAGE_KEYS.ACHIEVEMENTS, localAchievements);

      const isOnline = await checkConnectivity();
      if (isOnline) {
        try {
          const { error } = await supabase
            .from("achievements")
            .insert([newAchievement]);
          if (error) throw error;
        } catch (error) {
          await addToSyncQueue({
            table: "achievements",
            operation: "insert",
            data: newAchievement,
          });
        }
      } else {
        await addToSyncQueue({
          table: "achievements",
          operation: "insert",
          data: newAchievement,
        });
      }

      return newAchievement;
    },
  },

  // Special Notes
  specialNotes: {
    getAll: async (): Promise<SpecialNote[]> => {
      const isOnline = await checkConnectivity();

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from("special_notes")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            await saveToLocal(STORAGE_KEYS.SPECIAL_NOTES, data);
            await processSyncQueue();
            return data;
          }
        } catch (error) {
          console.error("Error fetching from Supabase:", error);
        }
      }

      return await getFromLocal<SpecialNote>(STORAGE_KEYS.SPECIAL_NOTES);
    },

    create: async (
      note: Omit<SpecialNote, "id" | "created_at" | "updated_at">,
    ): Promise<SpecialNote> => {
      const newNote: SpecialNote = {
        ...note,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save locally first
      const localNotes = await getFromLocal<SpecialNote>(
        STORAGE_KEYS.SPECIAL_NOTES,
      );
      localNotes.unshift(newNote);
      await saveToLocal(STORAGE_KEYS.SPECIAL_NOTES, localNotes);

      const isOnline = await checkConnectivity();
      if (isOnline) {
        try {
          const { error } = await supabase
            .from("special_notes")
            .insert([newNote]);
          if (error) throw error;
        } catch (error) {
          await addToSyncQueue({
            table: "special_notes",
            operation: "insert",
            data: newNote,
          });
        }
      } else {
        await addToSyncQueue({
          table: "special_notes",
          operation: "insert",
          data: newNote,
        });
      }

      return newNote;
    },

    update: async (note: SpecialNote): Promise<void> => {
      const updatedNote = { ...note, updated_at: new Date().toISOString() };

      // Update locally first
      const localNotes = await getFromLocal<SpecialNote>(
        STORAGE_KEYS.SPECIAL_NOTES,
      );
      const index = localNotes.findIndex((n) => n.id === note.id);
      if (index !== -1) {
        localNotes[index] = updatedNote;
        await saveToLocal(STORAGE_KEYS.SPECIAL_NOTES, localNotes);
      }

      const isOnline = await checkConnectivity();
      if (isOnline) {
        try {
          const { error } = await supabase
            .from("special_notes")
            .update(updatedNote)
            .eq("id", note.id);
          if (error) throw error;
        } catch (error) {
          await addToSyncQueue({
            table: "special_notes",
            operation: "update",
            data: updatedNote,
          });
        }
      } else {
        await addToSyncQueue({
          table: "special_notes",
          operation: "update",
          data: updatedNote,
        });
      }
    },

    delete: async (id: string): Promise<void> => {
      // Delete locally first
      const localNotes = await getFromLocal<SpecialNote>(
        STORAGE_KEYS.SPECIAL_NOTES,
      );
      const filteredNotes = localNotes.filter((n) => n.id !== id);
      await saveToLocal(STORAGE_KEYS.SPECIAL_NOTES, filteredNotes);

      const isOnline = await checkConnectivity();
      if (isOnline) {
        try {
          const { error } = await supabase
            .from("special_notes")
            .delete()
            .eq("id", id);
          if (error) throw error;
        } catch (error) {
          await addToSyncQueue({
            table: "special_notes",
            operation: "delete",
            data: { id },
          });
        }
      } else {
        await addToSyncQueue({
          table: "special_notes",
          operation: "delete",
          data: { id },
        });
      }
    },
  },
};

// Manual sync function
export const syncWithSupabase = async (): Promise<boolean> => {
  const isOnline = await checkConnectivity();
  if (!isOnline) return false;

  try {
    await processSyncQueue();
    return true;
  } catch (error) {
    console.error("Error syncing with Supabase:", error);
    return false;
  }
};
