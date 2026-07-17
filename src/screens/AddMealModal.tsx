import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { insertMeal, getMealsByDate, updateMeal } from "../db/mealsRepository";
import { useAppStore } from "../store/useAppStore";
import { Meal, MealMode, MealType } from "../types";
import { colors, spacing, radius, shadow } from "../styles/theme";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};
const MODES: { id: MealMode; label: string; description: string }[] = [
  {
    id: "A",
    label: "仅描述",
    description: "快速记录食物名称，不需要填写热量。",
  },
  {
    id: "B",
    label: "描述+热量",
    description: "记录食物和热量，适合关注卡路里摄入。",
  },
  {
    id: "C",
    label: "完整营养",
    description: "记录食物、热量和宏量营养，更精准地分析饮食。",
  },
];

interface Props {
  visible: boolean;
  date: string;
  meal?: Meal | null;
  onClose(): void;
  onSaved(): void;
}

export default function AddMealModal({
  visible,
  date,
  meal,
  onClose,
  onSaved,
}: Props) {
  const { setTodayMeals } = useAppStore();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [mode, setMode] = useState<MealMode>("A");
  const [desc, setDesc] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(meal);

  useEffect(() => {
    if (!visible) return;
    setMealType(meal?.meal_type ?? "breakfast");
    setMode(meal?.mode ?? "A");
    setDesc(meal?.description ?? "");
    setCalories(meal?.calories != null ? String(meal.calories) : "");
    setProtein(meal?.protein != null ? String(meal.protein) : "");
    setCarbs(meal?.carbs != null ? String(meal.carbs) : "");
    setFat(meal?.fat != null ? String(meal.fat) : "");
    setPhotos(meal?.photos ?? []);
  }, [visible, meal]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("需要相册权限", "请在系统设置中开启相册访问权限");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
    });
    if (!result.canceled)
      setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)]);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("需要相机权限", "请在系统设置中开启相机权限");
      return;
    }
    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled) setPhotos((p) => [...p, result.assets[0].uri]);
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (saving) return;
    if (!desc.trim()) {
      Alert.alert("请输入食物描述");
      return;
    }
    setSaving(true);
    try {
      const mealData = {
        date,
        meal_type: mealType,
        description: desc.trim(),
        mode,
        calories: mode !== "A" ? parseInt(calories) || undefined : undefined,
        protein: mode === "C" ? parseFloat(protein) || undefined : undefined,
        carbs: mode === "C" ? parseFloat(carbs) || undefined : undefined,
        fat: mode === "C" ? parseFloat(fat) || undefined : undefined,
        photos,
      };
      if (meal) await updateMeal({ id: meal.id, ...mealData });
      else await insertMeal(mealData);
      const meals = await getMealsByDate(date);
      setTodayMeals(meals);
      onSaved();
      setDesc("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setPhotos([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={s.container}>
        <Text style={s.title}>{isEditing ? "编辑饮食" : "添加饮食"}</Text>
        <Text style={s.label}>餐次</Text>
        <View style={s.row}>
          {MEAL_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.chip, mealType === t && s.chipActive]}
              onPress={() => setMealType(t)}
            >
              <Text style={mealType === t ? s.chipTxtA : s.chipTxt}>
                {MEAL_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>记录模式</Text>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[s.chip, mode === m.id && s.chipActive]}
            onPress={() => setMode(m.id)}
          >
            <Text style={mode === m.id ? s.chipTxtA : s.chipTxt}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={s.modeHelper}>
          {MODES.find((item) => item.id === mode)?.description}
        </Text>
        <Text style={s.label}>描述</Text>
        <TextInput
          style={s.input}
          placeholder="食物描述"
          value={desc}
          onChangeText={setDesc}
        />
        {mode !== "A" && (
          <>
            <Text style={s.label}>热量 (kcal)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />
          </>
        )}
        {mode === "C" && (
          <>
            <Text style={s.label}>蛋白质 (g)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
            <Text style={s.label}>碳水 (g)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
            <Text style={s.label}>脂肪 (g)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={fat}
              onChangeText={setFat}
            />
          </>
        )}
        <Text style={s.label}>照片</Text>
        <Text style={s.photoHint}>
          最多可添加 6 张，用于记录实际饮食或外出就餐。
        </Text>
        <View style={s.photoActions}>
          <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
            <Text style={s.photoBtnText}>拍照</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
            <Text style={s.photoBtnText}>从相册选</Text>
          </TouchableOpacity>
          <Text style={s.photoCount}>{photos.length} / 6</Text>
        </View>
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.photoGrid}
          >
            {photos.map((uri, i) => (
              <View key={i} style={s.photoCard}>
                <Image source={{ uri }} style={s.thumb} />
                <TouchableOpacity
                  style={s.photoDelete}
                  onPress={() => removePhoto(i)}
                  accessibilityRole="button"
                  accessibilityLabel="删除照片"
                >
                  <Ionicons name="close" size={16} color={colors.surface} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={s.photoEmpty}>还没有上传照片，可补充餐盘图或收据。</Text>
        )}
        <View style={s.buttonRow}>
          <TouchableOpacity
            style={[s.saveBtn, saving && s.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveTxt}>
              {saving ? "保存中..." : isEditing ? "保存修改" : "保存"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelTxt}>取消</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.page,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.large,
    color: colors.text,
  },
  label: {
    marginTop: spacing.medium,
    marginBottom: spacing.xsmall,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.small,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.small,
    marginBottom: spacing.small,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.xsmall,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { color: colors.textSecondary },
  chipTxtA: { color: colors.surface },
  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.small,
    marginBottom: spacing.small,
  },
  photoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.small,
    backgroundColor: colors.surface,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtnText: { color: colors.text, fontWeight: "600" },
  photoCount: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: spacing.small,
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.small,
  },
  photoGrid: {
    flexDirection: "row",
    gap: spacing.small,
    paddingVertical: spacing.small,
  },
  photoCard: {
    position: "relative",
    width: 92,
    height: 92,
    borderRadius: radius.input,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  photoDelete: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.small,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.large,
    alignItems: "center",
    flex: 1,
  },
  saveTxt: { color: colors.surface, fontSize: 16, fontWeight: "700" },
  cancelBtn: {
    padding: spacing.large,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flex: 1,
    marginLeft: spacing.small,
  },
  cancelTxt: { color: colors.textSecondary, fontWeight: "700" },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.small,
    marginTop: spacing.large,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
