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
import { colors, spacing, radius } from "../styles/theme";
import {
  deleteMealPhotos,
  deleteRemovedMealPhotos,
  persistMealPhotos,
} from "../utils/mealPhotos";

const MAX_PHOTOS = 6;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};
const NEXT_MEAL_TYPE: Record<MealType, MealType> = {
  breakfast: "lunch",
  lunch: "dinner",
  dinner: "snack",
  snack: "breakfast",
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
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("照片已满", `最多可添加 ${MAX_PHOTOS} 张照片`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("需要相册权限", "请在系统设置中开启相册访问权限");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
    });
    if (!result.canceled)
      setPhotos((p) =>
        [...p, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS),
      );
  }

  async function takePhoto() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("照片已满", `最多可添加 ${MAX_PHOTOS} 张照片`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("需要相机权限", "请在系统设置中开启相机权限");
      return;
    }
    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled)
      setPhotos((p) => [...p, result.assets[0].uri].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, idx) => idx !== index));
  }

  function resetMealFields() {
    setDesc("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setPhotos([]);
  }

  async function saveMeal({ continueAdding = false } = {}) {
    if (saving) return;
    if (!desc.trim()) {
      Alert.alert("请输入食物描述");
      return;
    }
    setSaving(true);
    let copiedPhotos: string[] = [];
    try {
      const persistedPhotos = await persistMealPhotos(photos);
      copiedPhotos = persistedPhotos.filter(
        (uri, index) => uri !== photos[index],
      );
      const mealData = {
        date,
        meal_type: mealType,
        description: desc.trim(),
        mode,
        calories: mode !== "A" ? parseInt(calories) || undefined : undefined,
        protein: mode === "C" ? parseFloat(protein) || undefined : undefined,
        carbs: mode === "C" ? parseFloat(carbs) || undefined : undefined,
        fat: mode === "C" ? parseFloat(fat) || undefined : undefined,
        photos: persistedPhotos,
      };
      if (meal) await updateMeal({ id: meal.id, ...mealData });
      else await insertMeal(mealData);
      if (meal) await deleteRemovedMealPhotos(meal.photos, persistedPhotos);
      const meals = await getMealsByDate(date);
      setTodayMeals(meals);
      resetMealFields();
      if (continueAdding && !meal) setMealType(NEXT_MEAL_TYPE[mealType]);
      else onSaved();
    } catch {
      await deleteMealPhotos(copiedPhotos);
      Alert.alert("保存失败", "照片或饮食记录保存失败，请稍后再试");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    saveMeal();
  }

  function handleSaveAndContinue() {
    saveMeal({ continueAdding: true });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.wrapper}>
        <View style={s.header}>
          <TouchableOpacity
            style={s.headerIcon}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="关闭"
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.title}>{isEditing ? "编辑饮食" : "添加饮食"}</Text>
            <Text style={s.subtitle}>{date}</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>
        <ScrollView
          style={s.container}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.section}>
            <Text style={s.label}>餐次</Text>
            <View style={s.segmentRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.segment, mealType === t && s.segmentActive]}
                  onPress={() => setMealType(t)}
                >
                  <Text style={mealType === t ? s.segmentTxtA : s.segmentTxt}>
                    {MEAL_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.label}>记录模式</Text>
            <View style={s.modeList}>
              {MODES.map((m) => {
                const active = mode === m.id;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.modeCard, active && s.modeCardActive]}
                    onPress={() => setMode(m.id)}
                  >
                    <View style={s.modeText}>
                      <Text style={active ? s.modeTitleA : s.modeTitle}>
                        {m.label}
                      </Text>
                      <Text
                        style={
                          active ? s.modeDescriptionA : s.modeDescription
                        }
                      >
                        {m.description}
                      </Text>
                    </View>
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={active ? colors.primary : colors.gray}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.label}>食物信息</Text>
            <TextInput
              style={s.input}
              placeholder="食物描述，例如：鸡胸肉沙拉"
              value={desc}
              onChangeText={setDesc}
            />
            {mode !== "A" && (
              <TextInput
                style={[s.input, s.inputStack]}
                placeholder="热量 (kcal)"
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
              />
            )}
            {mode === "C" && (
              <View style={s.macroGrid}>
                <TextInput
                  style={[s.input, s.macroInput]}
                  placeholder="蛋白 g"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
                <TextInput
                  style={[s.input, s.macroInput]}
                  placeholder="碳水 g"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
                <TextInput
                  style={[s.input, s.macroInput]}
                  placeholder="脂肪 g"
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            )}
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.label}>照片</Text>
                <Text style={s.photoHint}>
                  最多可添加 6 张，用于记录餐盘或外出就餐。
                </Text>
              </View>
              <Text style={s.photoCount}>
                {photos.length} / {MAX_PHOTOS}
              </Text>
            </View>
            <View style={s.photoActions}>
              <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
                <Ionicons
                  name="camera-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={s.photoBtnText}>拍照</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={s.photoBtnText}>相册</Text>
              </TouchableOpacity>
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
              <View style={s.photoEmptyBox}>
                <Ionicons name="image-outline" size={22} color={colors.gray} />
                <Text style={s.photoEmpty}>还没有上传照片</Text>
              </View>
            )}
          </View>
        </ScrollView>
        <View style={s.footer}>
          {isEditing ? (
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelTxt}>取消</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.continueBtn, saving && s.btnDisabled]}
              onPress={handleSaveAndContinue}
              disabled={saving}
            >
              <Text style={s.continueTxt}>
                {saving ? "保存中..." : "保存并继续"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveTxt}>
              {saving ? "保存中..." : isEditing ? "保存修改" : "保存"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 88,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.large,
    paddingBottom: spacing.medium,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },
  headerText: {
    flex: 1,
    paddingHorizontal: spacing.medium,
  },
  title: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.page,
    paddingBottom: spacing.large,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.medium,
    marginBottom: spacing.medium,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    marginBottom: spacing.small,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: colors.text,
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.input,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentTxt: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  segmentTxtA: {
    color: colors.surface,
    fontWeight: "800",
    fontSize: 13,
  },
  modeList: {
    gap: spacing.small,
  },
  modeCard: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.small,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
  },
  modeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modeText: {
    flex: 1,
    paddingRight: spacing.small,
  },
  modeTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  modeTitleA: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },
  modeDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  modeDescriptionA: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.small,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontSize: 15,
  },
  inputStack: {
    marginTop: spacing.small,
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.small,
    marginTop: spacing.small,
  },
  macroInput: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 0,
  },
  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
    marginTop: spacing.small,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    backgroundColor: colors.surfaceSoft,
    minWidth: 96,
  },
  photoBtnText: {
    marginLeft: 6,
    color: colors.text,
    fontWeight: "700",
  },
  photoCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  photoGrid: {
    flexDirection: "row",
    gap: spacing.small,
    paddingTop: spacing.medium,
  },
  photoCard: {
    position: "relative",
    width: 88,
    height: 88,
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
  photoEmptyBox: {
    marginTop: spacing.medium,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: spacing.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.small,
    padding: spacing.page,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.medium,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  saveTxt: { color: colors.surface, fontSize: 16, fontWeight: "800" },
  cancelBtn: {
    padding: spacing.medium,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    flex: 1,
  },
  cancelTxt: { color: colors.textSecondary, fontWeight: "800" },
  continueBtn: {
    padding: spacing.medium,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    flex: 1,
  },
  continueTxt: { color: colors.primary, fontWeight: "800" },
  btnDisabled: {
    opacity: 0.6,
  },
});
