import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import {
  PlusCircle,
  Edit2,
  Trash2,
  X,
  Check,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import {
  SpecialNote,
  offlineOperations,
  checkConnectivity,
  syncWithSupabase,
} from "../../lib/supabase";

interface SpecialNotesTabProps {
  notes?: SpecialNote[];
  onAddNote?: (content: string) => void;
  onEditNote?: (id: string, content: string) => void;
  onDeleteNote?: (id: string) => void;
}

export default function SpecialNotesTab({
  onAddNote = () => {},
  onEditNote = () => {},
  onDeleteNote = () => {},
}: SpecialNotesTabProps) {
  const [notes, setNotes] = useState<SpecialNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load notes and check connectivity
  useEffect(() => {
    loadNotes();
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    const online = await checkConnectivity();
    setIsOnline(online);
  };

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await offlineOperations.specialNotes.getAll();
      setNotes(data);
    } catch (error) {
      console.error("Error loading notes:", error);
      Alert.alert("Error", "Gagal memuat catatan");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const success = await syncWithSupabase();
      if (success) {
        await loadNotes();
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

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      Alert.alert("Error", "Harap isi konten catatan");
      return;
    }

    setLoading(true);
    try {
      const createdNote = await offlineOperations.specialNotes.create({
        content: newNoteContent,
      });
      setNotes([createdNote, ...notes]);
      onAddNote(newNoteContent);
      setNewNoteContent("");
      setIsAddingNote(false);

      const message = isOnline
        ? "Catatan berhasil ditambahkan dan disinkronkan"
        : "Catatan berhasil ditambahkan (akan disinkronkan saat online)";
      Alert.alert("Sukses", message);
    } catch (error) {
      console.error("Error adding note:", error);
      Alert.alert("Error", "Gagal menambahkan catatan");
    } finally {
      setLoading(false);
      await checkConnectionStatus();
    }
  };

  const handleEditNote = async (id: string) => {
    if (!editingContent.trim()) {
      Alert.alert("Error", "Harap isi konten catatan");
      return;
    }

    setLoading(true);
    try {
      const noteToUpdate = notes.find((note) => note.id === id);
      if (!noteToUpdate) return;

      const updatedNote = {
        ...noteToUpdate,
        content: editingContent,
      };

      await offlineOperations.specialNotes.update(updatedNote);

      const updatedNotes = notes.map((note) =>
        note.id === id ? updatedNote : note,
      );
      setNotes(updatedNotes);
      onEditNote(id, editingContent);
      setEditingNoteId(null);
      setEditingContent("");

      const message = isOnline
        ? "Catatan berhasil diperbarui dan disinkronkan"
        : "Catatan berhasil diperbarui (akan disinkronkan saat online)";
      Alert.alert("Sukses", message);
    } catch (error) {
      console.error("Error updating note:", error);
      Alert.alert("Error", "Gagal memperbarui catatan");
    } finally {
      setLoading(false);
      await checkConnectionStatus();
    }
  };

  const startEditing = (note: SpecialNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleDeleteNote = async (id: string) => {
    Alert.alert(
      "Konfirmasi",
      "Apakah Anda yakin ingin menghapus catatan ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await offlineOperations.specialNotes.delete(id);

              const updatedNotes = notes.filter((note) => note.id !== id);
              setNotes(updatedNotes);
              onDeleteNote(id);

              const message = isOnline
                ? "Catatan berhasil dihapus dan disinkronkan"
                : "Catatan berhasil dihapus (akan disinkronkan saat online)";
              Alert.alert("Sukses", message);
            } catch (error) {
              console.error("Error deleting note:", error);
              Alert.alert("Error", "Gagal menghapus catatan");
            } finally {
              setLoading(false);
              await checkConnectionStatus();
            }
          },
        },
      ],
    );
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View className="flex-1 bg-[#FFEDF3] p-4">
      {/* Header with connectivity status and Add Note button */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Text className="text-xl font-bold text-[#0ABAB5] mr-2">
            Catatan Khusus
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
          {!isAddingNote ? (
            <TouchableOpacity
              className="flex-row items-center bg-[#0ABAB5] px-3 py-2 rounded-full"
              onPress={() => setIsAddingNote(true)}
            >
              <PlusCircle size={16} color="#FFEDF3" />
              <Text className="text-[#FFEDF3] ml-1 font-medium text-xs">
                Tambah Catatan
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Add Note Form */}
      {isAddingNote && (
        <View className="bg-white rounded-lg p-4 mb-4 shadow">
          <TextInput
            className="bg-[#ADEED9]/20 p-3 rounded-lg mb-3 min-h-[100px] text-base"
            placeholder="Tulis catatan Anda di sini..."
            multiline
            value={newNoteContent}
            onChangeText={setNewNoteContent}
          />
          <View className="flex-row justify-end">
            <TouchableOpacity
              className="bg-gray-200 px-4 py-2 rounded-full mr-2"
              onPress={() => {
                setIsAddingNote(false);
                setNewNoteContent("");
              }}
            >
              <Text className="text-gray-700">Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-[#0ABAB5] px-4 py-2 rounded-full"
              onPress={handleAddNote}
              disabled={loading}
            >
              <Text className="text-white">
                {loading ? "Menyimpan..." : "Simpan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notes List */}
      <ScrollView className="flex-1">
        {notes.length === 0 ? (
          <View className="flex-1 items-center justify-center py-10">
            <Text className="text-gray-500 text-lg">
              Belum ada catatan. Tambahkan catatan pertama Anda!
            </Text>
          </View>
        ) : (
          notes.map((note) => (
            <View key={note.id} className="bg-white rounded-lg p-4 mb-4 shadow">
              {editingNoteId === note.id ? (
                <>
                  <TextInput
                    className="bg-[#ADEED9]/20 p-3 rounded-lg mb-3 min-h-[100px] text-base"
                    multiline
                    value={editingContent}
                    onChangeText={setEditingContent}
                  />
                  <View className="flex-row justify-end">
                    <TouchableOpacity
                      className="p-2 mr-2"
                      onPress={cancelEditing}
                    >
                      <X size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="p-2"
                      onPress={() => handleEditNote(note.id)}
                    >
                      <Check size={20} color="#0ABAB5" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-base mb-3">{note.content}</Text>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-500">
                      {note.updated_at !== note.created_at
                        ? `Diperbarui: ${formatDate(note.updated_at)}`
                        : `Dibuat: ${formatDate(note.created_at)}`}
                    </Text>
                    <View className="flex-row">
                      <TouchableOpacity
                        className="p-2 mr-2"
                        onPress={() => startEditing(note)}
                      >
                        <Edit2 size={18} color="#0ABAB5" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
