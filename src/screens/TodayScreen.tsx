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
import { useAppStore } from "../store/useAppStore";
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
    if (todayWeight?.date === selectedDate) await updateWeight(todayWeight.id, val);
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
    return parts.join(' · ');
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
          {selectedDate === currentDate ? "当前" : "记录"}：{todayWeight.weight}{" "}
          kg
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
                      >
                        <Text style={s.actionEdit}>编辑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => confirmDeleteMeal(m)}
                      >
                        <Text style={s.actionDelete}>删除</Text>
                      </TouchableOpacity>
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
      <TouchableOpacity style={s.addBtn} onPress={openAddMeal}>
        <Text style={s.addT}>+ 添加饮食</Text>
      </TouchableOpacity>
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
  container: { flex: 1, padding: 16 },
  content: { paddingBottom: 24 },
  dateField: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: "#b9c5d3",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 0,
    marginBottom: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateContent: { height: 44, justifyContent: "center" },
  dateLabel: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "bold",
    color: "#111827",
    includeFontPadding: false,
  },
  dateAction: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateActionText: { color: "#2e86de", fontWeight: "700" },
  dateChevron: {
    color: "#2e86de",
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
  },
  row: { flexDirection: "row", marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
  },
  btn: {
    backgroundColor: "#2e86de",
    borderRadius: 6,
    padding: 8,
    marginLeft: 8,
    justifyContent: "center",
  },
  btnT: { color: "#fff" },
  current: { marginBottom: 8, color: "#555" },
  group: { fontWeight: "bold", marginTop: 12, textTransform: "capitalize" },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  mealMain: { flex: 1, paddingRight: 12 },
  item: { color: "#333", fontSize: 16, fontWeight: "600" },
  mealMeta: { color: "#667085", marginTop: 4, fontSize: 13 },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    minWidth: 44,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEdit: { color: "#2e86de", fontWeight: "700" },
  actionDelete: { color: "#d92d20", fontWeight: "700" },
  empty: { paddingLeft: 8, paddingVertical: 2, color: "#666" },
  addBtn: {
    marginTop: 20,
    backgroundColor: "#2e86de",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  addT: { color: "#fff", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "center",
    padding: 16,
  },
  calendarSheet: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  calendarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  calendar: { borderRadius: 10 },
  calendarArrow: { color: "#2e86de", fontSize: 30, fontWeight: "800" },
  calendarActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#e7f1ff",
  },
  todayBtnT: { color: "#2e86de", fontWeight: "600" },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#f1f3f5",
  },
  cancelBtnT: { color: "#333", fontWeight: "600" },
});
