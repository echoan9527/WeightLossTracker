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
  insertWeight,
  getAllWeights,
  getWeightByDate,
  updateWeight,
} from "../db/weightsRepository";
import AddMealModal from "./AddMealModal";
import { Meal } from "../types";

const MEAL_TYPE_LABELS = {
  breakfast: "早餐 Breakfast",
  lunch: "午餐 Lunch",
  dinner: "晚餐 Dinner",
  snack: "加餐 Snack",
} as const;

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
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  useEffect(() => {
    async function loadSelectedDate() {
      const [meals, weight] = await Promise.all([
        getMealsByDate(selectedDate),
        getWeightByDate(selectedDate),
      ]);
      setTodayMeals(meals);
      setTodayWeight(weight);
      setWeightInput("");
    }

    loadSelectedDate();
  }, [selectedDate, setTodayMeals, setTodayWeight]);

  async function saveWeight() {
    const val = parseFloat(weightInput);
    if (isNaN(val)) return Alert.alert("请输入有效体重");
    if (todayWeight?.date === selectedDate)
      await updateWeight(todayWeight.id, val);
    else await insertWeight(selectedDate, val);
    const [all, weight] = await Promise.all([
      getAllWeights(),
      getWeightByDate(selectedDate),
    ]);
    setAllWeights(all);
    setTodayWeight(weight);
    setWeightInput("");
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
    Alert.alert("删除饮食记录", `确定删除“${meal.description}”吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          await deleteMeal(meal.id);
          const meals = await getMealsByDate(selectedDate);
          setTodayMeals(meals);
        },
      },
    ]);
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

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity
        accessibilityRole="button"
        style={s.dateField}
        onPress={() => setCalendarVisible(true)}
      >
        <View style={s.dateContent}>
          <Text style={s.date}>{selectedDate}</Text>
        </View>
        <View style={s.dateAction}>
          <Text style={s.dateChevron}>›</Text>
        </View>
      </TouchableOpacity>
      <View style={s.row}>
        <TextInput
          style={s.input}
          placeholder="体重 (kg)"
          keyboardType="numeric"
          value={weightInput}
          onChangeText={setWeightInput}
        />
        <TouchableOpacity style={s.btn} onPress={saveWeight}>
          <Text style={s.btnT}>保存</Text>
        </TouchableOpacity>
      </View>
      {todayWeight && (
        <Text style={s.current}>
          {isCurrentDate ? "当前" : "记录"}：{todayWeight.weight} kg
        </Text>
      )}
      {groups.map((g) => {
        const items = todayMeals.filter((m) => m.meal_type === g);
        return (
          <View key={g}>
            <Text style={s.group}>{MEAL_TYPE_LABELS[g]}</Text>
            {items.length > 0 ? (
              items.map((m) => {
                const meta = formatMealMeta(m);
                return (
                  <View key={m.id} style={s.mealItem}>
                    <TouchableOpacity
                      style={s.mealMain}
                      onPress={() => openEditMeal(m)}
                    >
                      <Text style={s.item}>{m.description}</Text>
                      {meta ? <Text style={s.mealMeta}>{meta}</Text> : null}
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
                          size={20}
                          color="#2e86de"
                        />
                      </TouchableOpacity>
                      {isCurrentDate && (
                        <TouchableOpacity
                          style={s.actionBtn}
                          onPress={() => confirmDeleteMeal(m)}
                          accessibilityRole="button"
                          accessibilityLabel="删除"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#d92d20"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={s.empty}>无</Text>
            )}
          </View>
        );
      })}
      {isCurrentDate && (
        <TouchableOpacity style={s.addBtn} onPress={openAddMeal}>
          <Text style={s.addT}>+ 添加饮食</Text>
        </TouchableOpacity>
      )}
      <AddMealModal
        visible={showModal}
        date={selectedDate}
        meal={editingMeal}
        onClose={closeMealModal}
        onSaved={closeMealModal}
      />
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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.page,
  },
  content: { paddingBottom: spacing.large },
  dateField: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.medium,
    paddingVertical: 0,
    marginBottom: spacing.medium,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateContent: { height: 44, justifyContent: "center" },
  date: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "bold",
    color: colors.text,
    includeFontPadding: false,
  },
  dateAction: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateChevron: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 30,
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
  },
  row: { flexDirection: "row", marginBottom: spacing.small },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.small,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.input,
    padding: spacing.small,
    marginLeft: spacing.small,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 92,
  },
  btnT: { color: colors.surface, fontWeight: "700" },
  current: { marginBottom: spacing.small, color: colors.textMuted },
  group: {
    fontWeight: "800",
    marginTop: spacing.section,
    marginBottom: spacing.xsmall,
    color: colors.textSecondary,
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: spacing.small,
    ...shadow,
  },
  mealMain: { flex: 1, paddingRight: 12 },
  item: { color: colors.text, fontSize: 16, fontWeight: "600" },
  mealMeta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
  },
  actionBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input,
    padding: 8,
    backgroundColor: colors.surfaceSoft,
  },
  actionDelete: { color: colors.danger, fontWeight: "700" },
  empty: {
    paddingLeft: spacing.small,
    paddingVertical: 10,
    color: colors.textMuted,
  },
  wrapper: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    marginTop: spacing.large,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.large,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 5,
  },
  addT: { color: colors.surface, fontSize: 16, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: spacing.page,
    bottom: spacing.page,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.large,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  fabText: {
    marginLeft: spacing.xsmall,
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
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
