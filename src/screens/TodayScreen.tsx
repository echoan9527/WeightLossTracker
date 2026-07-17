import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../store/useAppStore";
import { colors, spacing, radius, shadow } from "../styles/theme";
import { deleteMeal, getMealsByDate } from "../db/mealsRepository";
import {
  deleteWeight,
  insertWeight,
  getAllWeights,
  getPreviousWeightByDate,
  getWeightByDate,
  updateWeight,
} from "../db/weightsRepository";
import AddMealModal from "./AddMealModal";
import { Meal } from "../types";
import { deleteMealPhotos } from "../utils/mealPhotos";

const MEAL_TYPE_LABELS = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
} as const;
const MEAL_TYPE_ICONS: Record<
  keyof typeof MEAL_TYPE_LABELS,
  keyof typeof Ionicons.glyphMap
> = {
  breakfast: "cafe-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "nutrition-outline",
};

LocaleConfig.locales.zh = {
  monthNames: [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ],
  monthNamesShort: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
  dayNames: [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ],
  dayNamesShort: ["日", "一", "二", "三", "四", "五", "六"],
  today: "今天",
};
LocaleConfig.defaultLocale = "zh";

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = () => formatDateKey(new Date());

function formatDisplayDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${month}月${day}日 ${weekdays[date.getDay()]}`;
}

export default function TodayScreen() {
  const {
    todayMeals,
    setTodayMeals,
    todayWeight,
    setTodayWeight,
    setAllWeights,
  } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(today());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightEditing, setWeightEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meal | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);
  const [previousWeight, setPreviousWeight] = useState<number | null>(null);
  const [weightDeleteVisible, setWeightDeleteVisible] = useState(false);
  const [deletingWeight, setDeletingWeight] = useState(false);

  useEffect(() => {
    async function loadSelectedDate() {
      const [meals, weight, previous] = await Promise.all([
        getMealsByDate(selectedDate),
        getWeightByDate(selectedDate),
        getPreviousWeightByDate(selectedDate),
      ]);
      setTodayMeals(meals);
      setTodayWeight(weight);
      setPreviousWeight(previous?.weight ?? null);
      setWeightInput("");
      setWeightEditing(false);
    }

    loadSelectedDate();
  }, [selectedDate, setTodayMeals, setTodayWeight]);

  async function saveWeight() {
    const val = parseFloat(weightInput);
    if (isNaN(val)) return Alert.alert("请输入有效体重");
    if (todayWeight?.date === selectedDate)
      await updateWeight(todayWeight.id, val);
    else await insertWeight(selectedDate, val);
    const [all, weight, previous] = await Promise.all([
      getAllWeights(),
      getWeightByDate(selectedDate),
      getPreviousWeightByDate(selectedDate),
    ]);
    setAllWeights(all);
    setTodayWeight(weight);
    setPreviousWeight(previous?.weight ?? null);
    setWeightInput("");
    setWeightEditing(false);
  }

  function confirmDeleteWeight() {
    if (!todayWeight) return;
    setWeightDeleteVisible(true);
  }

  async function deleteSelectedWeight() {
    if (!todayWeight || deletingWeight) return;
    setDeletingWeight(true);
    setWeightDeleteVisible(false);
    try {
      await deleteWeight(todayWeight.id);
      const [all, weight, previous] = await Promise.all([
        getAllWeights(),
        getWeightByDate(selectedDate),
        getPreviousWeightByDate(selectedDate),
      ]);
      setAllWeights(all);
      setTodayWeight(weight);
      setPreviousWeight(previous?.weight ?? null);
      setWeightInput("");
      setWeightEditing(false);
    } catch {
      Alert.alert("删除失败", "请稍后再试");
    } finally {
      setDeletingWeight(false);
    }
  }

  function startWeightEdit() {
    setWeightInput(todayWeight ? String(todayWeight.weight) : "");
    setWeightEditing(true);
  }

  function selectDate(day: DateData) {
    setSelectedDate(day.dateString);
    setCalendarVisible(false);
  }

  function openAddMeal() {
    setEditingMeal(null);
    setShowModal(true);
  }

  function openEditMeal(meal: Meal) {
    setEditingMeal(meal);
    setShowModal(true);
  }

  function closeMealModal() {
    setShowModal(false);
    setEditingMeal(null);
  }

  function formatMealMeta(meal: Meal) {
    const parts = [
      meal.calories != null ? `${meal.calories} kcal` : null,
      meal.protein != null ? `蛋白 ${meal.protein}g` : null,
      meal.carbs != null ? `碳水 ${meal.carbs}g` : null,
      meal.fat != null ? `脂肪 ${meal.fat}g` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }

  function confirmDeleteMeal(meal: Meal) {
    setDeleteTarget(meal);
  }

  async function deleteSelectedMeal() {
    if (!deleteTarget || deletingMealId) return;
    const meal = deleteTarget;
    setDeletingMealId(meal.id);
    setDeleteTarget(null);
    setTodayMeals(todayMeals.filter((item) => item.id !== meal.id));
    try {
      await deleteMeal(meal.id);
      await deleteMealPhotos(meal.photos);
      const meals = await getMealsByDate(selectedDate);
      setTodayMeals(meals);
    } catch {
      const meals = await getMealsByDate(selectedDate);
      setTodayMeals(meals);
      Alert.alert("删除失败", "请稍后再试");
    } finally {
      setDeletingMealId(null);
    }
  }

  const currentDate = today();
  const isCurrentDate = selectedDate === currentDate;
  const markedDates = {
    [currentDate]: {
      marked: true,
      dotColor: "#2e86de",
    },
    [selectedDate]: {
      selected: true,
      selectedColor: "#2e86de",
      selectedTextColor: "#fff",
      marked: selectedDate === currentDate,
      dotColor: "#fff",
    },
  };
  const groups = ["breakfast", "lunch", "dinner", "snack"] as const;
  const totalCalories = todayMeals.reduce(
    (sum, meal) => sum + (meal.calories ?? 0),
    0,
  );
  const weightChange =
    todayWeight && previousWeight != null
      ? todayWeight.weight - previousWeight
      : null;
  const weightChangeAbs =
    weightChange != null ? Math.abs(weightChange).toFixed(1) : null;
  const weightChangeLabel =
    weightChange == null
      ? null
      : Math.abs(weightChange) < 0.05
        ? "较上次持平"
        : weightChange > 0
          ? `较上次 +${weightChangeAbs} kg`
          : `较上次 -${weightChangeAbs} kg`;

  return (
    <View style={s.wrapper}>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.overviewCard}>
          <TouchableOpacity
            accessibilityRole="button"
            style={s.dateField}
            onPress={() => setCalendarVisible(true)}
          >
            <View>
              <Text style={s.dateKicker}>
                {isCurrentDate ? "今天" : "记录日"}
              </Text>
              <Text style={s.date}>{formatDisplayDate(selectedDate)}</Text>
              <Text style={s.dateSub}>{selectedDate}</Text>
            </View>
            <View style={s.dateAction}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
          <View style={s.metricsRow}>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>体重</Text>
              <Text style={s.metricValue}>
                {todayWeight ? `${todayWeight.weight} kg` : "--"}
              </Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>摄入</Text>
              <Text style={s.metricValue}>{totalCalories} kcal</Text>
            </View>
          </View>
        </View>

        <View style={s.weightCard}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>体重记录</Text>
              <Text style={s.sectionHint}>
                {todayWeight
                  ? `${isCurrentDate ? "今日" : "当日"}已有记录，可随时修正`
                  : "还没有记录体重"}
              </Text>
            </View>
            {!weightEditing && (
              <TouchableOpacity
                style={s.iconAction}
                onPress={startWeightEdit}
                accessibilityRole="button"
                accessibilityLabel={todayWeight ? "编辑体重" : "记录体重"}
              >
                <Ionicons
                  name={todayWeight ? "create-outline" : "add-outline"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
          {weightEditing ? (
            <View style={s.weightEditor}>
              <TextInput
                style={s.input}
                placeholder="体重 (kg)"
                keyboardType="numeric"
                value={weightInput}
                onChangeText={setWeightInput}
              />
              <View style={s.weightActions}>
                <TouchableOpacity style={s.btn} onPress={saveWeight}>
                  <Text style={s.btnT}>保存</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => {
                    setWeightInput("");
                    setWeightEditing(false);
                  }}
                >
                  <Text style={s.secondaryBtnT}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            todayWeight ? (
              <View style={s.weightResultRow}>
                <Text style={s.weightValue}>{todayWeight.weight} kg</Text>
                {weightChangeLabel ? (
                  <View
                    style={[
                      s.weightChangeBadge,
                      weightChange != null &&
                        weightChange > 0.05 &&
                        s.weightChangeUp,
                      weightChange != null &&
                        weightChange < -0.05 &&
                        s.weightChangeDown,
                    ]}
                  >
                    <Ionicons
                      name={
                        weightChange != null && weightChange > 0.05
                          ? "trending-up-outline"
                          : weightChange != null && weightChange < -0.05
                            ? "trending-down-outline"
                            : "remove-outline"
                      }
                      size={15}
                      color={
                        weightChange != null && weightChange > 0.05
                          ? colors.danger
                          : weightChange != null && weightChange < -0.05
                            ? colors.success
                            : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        s.weightChangeText,
                        weightChange != null &&
                          weightChange > 0.05 &&
                          s.weightChangeTextUp,
                        weightChange != null &&
                          weightChange < -0.05 &&
                          s.weightChangeTextDown,
                      ]}
                    >
                      {weightChangeLabel}
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={s.deleteWeightIconBtn}
                  onPress={confirmDeleteWeight}
                  accessibilityRole="button"
                  accessibilityLabel="删除体重记录"
                  disabled={deletingWeight}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>
            ) : null
          )}
        </View>

        <View style={s.mealsHeader}>
          <Text style={s.sectionTitle}>
            {isCurrentDate ? "今日饮食" : "当日饮食"}
          </Text>
          <TouchableOpacity
            style={s.inlineAddBtn}
            onPress={openAddMeal}
            accessibilityRole="button"
            accessibilityLabel={isCurrentDate ? "添加饮食" : "补记饮食"}
          >
            <Ionicons name="add" size={18} color={colors.surface} />
            <Text style={s.inlineAddText}>
              {isCurrentDate ? "添加饮食记录" : "补记饮食"}
            </Text>
          </TouchableOpacity>
        </View>
        {todayMeals.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="restaurant-outline" size={26} color={colors.gray} />
            <Text style={s.emptyTitle}>还没有饮食记录</Text>
            <Text style={s.emptyText}>
              {isCurrentDate
                ? "添加第一餐后，这里会按餐次整理显示。"
                : "可以补记这一天的饮食，记录会保存到所选日期。"}
            </Text>
          </View>
        ) : null}
        {todayMeals.length > 0
          ? groups.map((g) => {
              const items = todayMeals.filter((m) => m.meal_type === g);
              return (
                <View key={g} style={s.mealSection}>
                  <View style={s.mealSectionHeader}>
                    <View style={s.mealTitleWrap}>
                      <View style={s.mealIcon}>
                        <Ionicons
                          name={MEAL_TYPE_ICONS[g]}
                          size={17}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={s.group}>{MEAL_TYPE_LABELS[g]}</Text>
                    </View>
                    <Text style={s.mealCount}>{items.length || "未记录"}</Text>
                  </View>
                  {items.length > 0 ? (
                    items.map((m, index) => {
                      const meta = formatMealMeta(m);
                      return (
                        <View
                          key={m.id}
                          style={[
                            s.mealItem,
                            index === items.length - 1 && s.mealItemLast,
                          ]}
                        >
                          <TouchableOpacity
                            style={s.mealMain}
                            onPress={() => openEditMeal(m)}
                          >
                            <Text style={s.item}>{m.description}</Text>
                            {meta ? (
                              <Text style={s.mealMeta}>{meta}</Text>
                            ) : null}
                          </TouchableOpacity>
                          <View style={s.mealActions}>
                            <TouchableOpacity
                              style={s.actionBtn}
                              onPress={() => openEditMeal(m)}
                              accessibilityRole="button"
                              accessibilityLabel="编辑"
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={colors.primary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                s.actionBtn,
                                deletingMealId === m.id && s.actionBtnDisabled,
                              ]}
                              onPress={() => confirmDeleteMeal(m)}
                              accessibilityRole="button"
                              accessibilityLabel="删除"
                              disabled={deletingMealId === m.id}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color={colors.danger}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={s.empty}>尚未记录</Text>
                  )}
                </View>
              );
            })
          : null}
      </ScrollView>
      <AddMealModal
        visible={showModal}
        date={selectedDate}
        meal={editingMeal}
        onClose={closeMealModal}
        onSaved={closeMealModal}
      />
      {deleteTarget && (
        <Modal
          transparent
          visible={Boolean(deleteTarget)}
          animationType="fade"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <View style={s.confirmBackdrop}>
            <View style={s.confirmCard}>
              <View style={s.confirmIcon}>
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.danger}
                />
              </View>
              <Text style={s.confirmTitle}>删除饮食记录</Text>
              <Text style={s.confirmText}>
                确定删除“{deleteTarget.description}”吗？
              </Text>
              <View style={s.confirmActions}>
                <TouchableOpacity
                  style={s.confirmCancel}
                  onPress={() => setDeleteTarget(null)}
                >
                  <Text style={s.confirmCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.confirmDelete}
                  onPress={deleteSelectedMeal}
                >
                  <Text style={s.confirmDeleteText}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {weightDeleteVisible && todayWeight && (
        <Modal
          transparent
          visible={weightDeleteVisible}
          animationType="fade"
          onRequestClose={() => setWeightDeleteVisible(false)}
        >
          <View style={s.confirmBackdrop}>
            <View style={s.confirmCard}>
              <View style={s.confirmIcon}>
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.danger}
                />
              </View>
              <Text style={s.confirmTitle}>删除体重记录</Text>
              <Text style={s.confirmText}>
                确定删除 {selectedDate} 的 {todayWeight.weight} kg 记录吗？
              </Text>
              <View style={s.confirmActions}>
                <TouchableOpacity
                  style={s.confirmCancel}
                  onPress={() => setWeightDeleteVisible(false)}
                >
                  <Text style={s.confirmCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.confirmDelete,
                    deletingWeight && s.confirmDeleteDisabled,
                  ]}
                  onPress={deleteSelectedWeight}
                  disabled={deletingWeight}
                >
                  <Text style={s.confirmDeleteText}>
                    {deletingWeight ? "删除中..." : "删除"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {calendarVisible && (
        <Modal
          transparent
          visible={calendarVisible}
          animationType="fade"
          onRequestClose={() => setCalendarVisible(false)}
        >
          <View style={s.modalBackdrop}>
            <View style={s.calendarSheet}>
              <Text style={s.calendarTitle}>选择日期</Text>
              <Calendar
                current={selectedDate}
                onDayPress={selectDate}
                enableSwipeMonths
                hideExtraDays
                monthFormat="yyyy年M月"
                markedDates={markedDates}
                renderArrow={(direction) => (
                  <Text style={s.calendarArrow}>
                    {direction === "left" ? "‹" : "›"}
                  </Text>
                )}
                theme={{
                  backgroundColor: "#fff",
                  calendarBackground: "#fff",
                  textSectionTitleColor: "#5f6b7a",
                  selectedDayBackgroundColor: "#2e86de",
                  selectedDayTextColor: "#fff",
                  todayTextColor: "#2e86de",
                  dayTextColor: "#1f2933",
                  textDisabledColor: "#c2c8d0",
                  monthTextColor: "#111827",
                  textMonthFontWeight: "700",
                  textDayHeaderFontWeight: "700",
                  textDayFontSize: 17,
                  textMonthFontSize: 20,
                  arrowColor: "#2e86de",
                }}
                style={s.calendar}
              />
              <View style={s.calendarActions}>
                <TouchableOpacity
                  style={s.todayBtn}
                  onPress={() => {
                    setSelectedDate(currentDate);
                    setCalendarVisible(false);
                  }}
                >
                  <Text style={s.todayBtnT}>今天</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setCalendarVisible(false)}
                >
                  <Text style={s.cancelBtnT}>取消</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.page,
  },
  content: { paddingBottom: spacing.large },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    marginBottom: spacing.medium,
    ...shadow,
  },
  dateField: {
    minHeight: 68,
    marginBottom: spacing.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateKicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  date: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    color: colors.text,
  },
  dateSub: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  dateAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  metricsRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.medium,
    flexDirection: "row",
    alignItems: "center",
  },
  metricItem: { flex: 1 },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  weightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    marginBottom: spacing.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: "600",
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  weightValue: {
    flex: 1,
    minWidth: 92,
    color: colors.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
  },
  weightResultRow: {
    marginTop: spacing.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.small,
  },
  weightChangeBadge: {
    minHeight: 34,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.small,
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 1,
  },
  weightChangeUp: {
    backgroundColor: "#fff1f0",
  },
  weightChangeDown: {
    backgroundColor: "#ecfdf3",
  },
  weightChangeText: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  weightChangeTextUp: {
    color: colors.danger,
  },
  weightChangeTextDown: {
    color: colors.success,
  },
  deleteWeightIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff1f0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  weightEditor: {
    marginTop: spacing.medium,
    gap: spacing.small,
  },
  weightActions: {
    flexDirection: "row",
    gap: spacing.small,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.small,
    paddingVertical: 11,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontSize: 15,
  },
  btn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.input,
    padding: spacing.small,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 44,
  },
  btnT: { color: colors.surface, fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.input,
    padding: spacing.small,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 44,
  },
  secondaryBtnT: { color: colors.textSecondary, fontWeight: "700" },
  mealsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.small,
  },
  inlineAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineAddText: {
    marginLeft: 4,
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  mealSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.medium,
    paddingBottom: spacing.small,
    marginBottom: spacing.medium,
  },
  mealSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.small,
  },
  mealTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginRight: spacing.small,
  },
  group: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  mealCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 13,
  },
  mealItemLast: { paddingBottom: 4 },
  mealMain: { flex: 1, paddingRight: 12 },
  item: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  mealMeta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  empty: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.large,
    marginBottom: spacing.medium,
  },
  emptyTitle: {
    marginTop: spacing.small,
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "center",
    padding: spacing.page,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.large,
    alignItems: "center",
    ...shadow,
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff1f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.medium,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "800",
    marginBottom: spacing.xsmall,
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.small,
    marginTop: spacing.large,
    width: "100%",
  },
  confirmCancel: {
    flex: 1,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.medium,
    alignItems: "center",
  },
  confirmDelete: {
    flex: 1,
    borderRadius: radius.input,
    backgroundColor: colors.danger,
    padding: spacing.medium,
    alignItems: "center",
  },
  confirmDeleteDisabled: {
    opacity: 0.55,
  },
  confirmCancelText: {
    color: colors.textSecondary,
    fontWeight: "800",
  },
  confirmDeleteText: {
    color: colors.surface,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "center",
    padding: spacing.page,
  },
  calendarSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    shadowColor: shadow.shadowColor,
    shadowOffset: shadow.shadowOffset,
    shadowOpacity: shadow.shadowOpacity,
    shadowRadius: shadow.shadowRadius,
    elevation: shadow.elevation,
  },
  calendarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.small,
  },
  calendar: { borderRadius: radius.input },
  calendarArrow: { color: colors.primary, fontSize: 30, fontWeight: "800" },
  calendarActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.small,
    marginTop: spacing.medium,
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.input,
    backgroundColor: colors.primarySoft,
  },
  todayBtnT: { color: colors.primary, fontWeight: "600" },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSoft,
  },
  cancelBtnT: { color: colors.text, fontWeight: "600" },
});
