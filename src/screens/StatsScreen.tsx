import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Image,
} from "react-native";
import { Calendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { useAppStore } from "../store/useAppStore";
import { getAllWeights, getWeightByDate } from "../db/weightsRepository";
import { getMealsByDate, getMealsByDateRange } from "../db/mealsRepository";
import { Meal, Weight } from "../types";
import { colors, spacing, radius, shadow } from "../styles/theme";

const W = Dimensions.get("window").width - 32;
type Range = "7d" | "30d" | "all";
type ChartPoint = { label: string; value: number };
const MEAL_TYPE_LABELS = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
} as const;
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = () => formatDateKey(new Date());

function getLatestWeightsByDate(weights: Weight[]) {
  const byDate = new Map<string, Weight>();
  weights.forEach((weight) => {
    const current = byDate.get(weight.date);
    if (!current || weight.id > current.id) byDate.set(weight.date, weight);
  });
  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function MiniLineChart({
  data,
  color,
  valueSuffix,
}: {
  data: ChartPoint[];
  color: string;
  valueSuffix: string;
}) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  // available inner width inside the card: container inner (W) minus card paddings
  const availableInner = Math.max(W - spacing.medium * 2, 0);
  const chartWidth = Math.max(availableInner - 24, 0);
  const chartHeight = 126;
  const points = data.map((d, index) => ({
    ...d,
    x:
      data.length === 1
        ? chartWidth / 2
        : (index / (data.length - 1)) * chartWidth,
    y: chartHeight - ((d.value - min) / range) * chartHeight,
  }));

  return (
    <View style={s.chartBox}>
      <View style={[s.linePlot, { width: chartWidth }]}>
        {points.slice(1).map((point, index) => {
          const prev = points[index];
          const dx = point.x - prev.x;
          const dy = point.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = `${Math.atan2(dy, dx)}rad`;

          return (
            <View
              key={`line-${prev.label}-${point.label}`}
              style={[
                s.lineSegment,
                {
                  width: length,
                  left: prev.x + dx / 2 - length / 2,
                  top: prev.y + dy / 2,
                  backgroundColor: color,
                  transform: [{ rotate: angle }],
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => {
          const showLabel =
            data.length <= 8 || index % Math.ceil(data.length / 6) === 0;

          return (
            <View
              key={`${point.label}-${index}`}
              style={[s.pointWrap, { left: point.x - 30, top: point.y - 24 }]}
            >
              <Text style={s.pointValue}>
                {point.value > 0 ? `${point.value}${valueSuffix}` : ""}
              </Text>
              <View style={[s.point, { backgroundColor: color }]} />
              <Text style={s.pointLabel}>{showLabel ? point.label : ""}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { allWeights, setAllWeights } = useAppStore();
  const [range, setRange] = useState<Range>("7d");
  const [selectedDate, setSelectedDate] = useState(today());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [selectedWeight, setSelectedWeight] = useState<Weight | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const [calByDate, setCalByDate] = useState<Record<string, number>>({});

  useEffect(() => {
    getAllWeights().then(setAllWeights);
  }, []);

  const latestWeights = getLatestWeightsByDate(allWeights);
  const cutoff =
    range === "7d" ? 7 : range === "30d" ? 30 : latestWeights.length;
  const filtered = latestWeights.slice(-cutoff);

  useEffect(() => {
    if (filtered.length === 0) return;
    const from = filtered[0].date;
    const to = filtered[filtered.length - 1].date;
    getMealsByDateRange(from, to).then((meals) => {
      const map: Record<string, number> = {};
      meals.forEach((m) => {
        map[m.date] = (map[m.date] ?? 0) + (m.calories ?? 0);
      });
      setCalByDate(map);
    });
  }, [range, latestWeights.length]);

  useEffect(() => {
    Promise.all([
      getMealsByDate(selectedDate),
      getWeightByDate(selectedDate),
    ]).then(([meals, weight]) => {
      setDayMeals(meals);
      setSelectedWeight(weight);
      setFailedPhotos(new Set());
    });
  }, [selectedDate]);

  const weightData = filtered.map((w) => ({
    label: w.date.slice(5),
    value: w.weight,
  }));
  const calData = filtered.map((w) => ({
    label: w.date.slice(5),
    value: calByDate[w.date] ?? 0,
  }));
  const selectedCalories = dayMeals.reduce(
    (sum, meal) => sum + (meal.calories ?? 0),
    0,
  );
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

  function selectDate(day: DateData) {
    setSelectedDate(day.dateString);
    setCalendarVisible(false);
  }

  function markPhotoFailed(uri: string) {
    setFailedPhotos((current) => {
      const next = new Set(current);
      next.add(uri);
      return next;
    });
    if (previewPhoto === uri) setPreviewPhoto(null);
  }

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>体重趋势</Text>
      <View style={s.rangeRow}>
        {(["7d", "30d", "all"] as Range[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[s.chip, range === r && s.chipA]}
            onPress={() => setRange(r)}
          >
            <Text style={range === r ? s.chipTA : s.chipT}>
              {r === "all" ? "全部" : r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {weightData.length > 0 && (
        <View style={s.chartCard}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>体重变化</Text>
            <Text style={s.cardValue}>
              {weightData[weightData.length - 1]?.value.toFixed(1)} kg
            </Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>最高</Text>
              <Text style={s.summaryValue}>
                {Math.max(...weightData.map((d) => d.value)).toFixed(1)} kg
              </Text>
            </View>
            <View style={[s.summaryItem, s.summaryItemSpace]}>
              <Text style={s.summaryLabel}>最低</Text>
              <Text style={s.summaryValue}>
                {Math.min(...weightData.map((d) => d.value)).toFixed(1)} kg
              </Text>
            </View>
            <View style={[s.summaryItem, s.summaryItemSpace]}>
              <Text style={s.summaryLabel}>范围</Text>
              <Text style={s.summaryValue}>
                {(
                  Math.max(...weightData.map((d) => d.value)) -
                  Math.min(...weightData.map((d) => d.value))
                ).toFixed(1)}{" "}
                kg
              </Text>
            </View>
          </View>
          <MiniLineChart
            data={weightData}
            color={colors.primary}
            valueSuffix="kg"
          />
        </View>
      )}
      <Text style={s.title}>每日热量 (kcal)</Text>
      {calData.length > 0 && (
        <View style={s.chartCard}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>当日热量</Text>
            <Text style={s.cardValue}>
              {Math.max(...calData.map((d) => d.value))} kcal
            </Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>最高</Text>
              <Text style={s.summaryValue}>
                {Math.max(...calData.map((d) => d.value))} kcal
              </Text>
            </View>
            <View style={[s.summaryItem, s.summaryItemSpace]}>
              <Text style={s.summaryLabel}>最低</Text>
              <Text style={s.summaryValue}>
                {Math.min(...calData.map((d) => d.value))} kcal
              </Text>
            </View>
            <View style={[s.summaryItem, s.summaryItemSpace]}>
              <Text style={s.summaryLabel}>总天数</Text>
              <Text style={s.summaryValue}>{calData.length}</Text>
            </View>
          </View>
          <MiniLineChart data={calData} color="#e67e22" valueSuffix="" />
        </View>
      )}
      <Text style={s.title}>饮食明细</Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={s.dateField}
        onPress={() => setCalendarVisible(true)}
      >
        <View>
          {/* <Text style={s.dateLabel}>选择日期</Text> */}
          <Text style={s.dateValue}>{selectedDate}</Text>
        </View>
        <Text style={s.dateChevron}>›</Text>
      </TouchableOpacity>
      <View style={s.mealBox}>
        <View style={s.detailHeader}>
          <View>
            <Text style={s.detailMeta}>
              {selectedWeight ? `${selectedWeight.weight} kg` : "暂无体重"} ·
              摄入 {selectedCalories} kcal
            </Text>
          </View>
        </View>
        {dayMeals.length === 0 ? (
          <Text style={s.empty}>暂无饮食记录</Text>
        ) : (
          MEAL_TYPES.map((type) => {
            const meals = dayMeals.filter((m) => m.meal_type === type);
            if (meals.length === 0) return null;
            const attachments = meals
              .flatMap((meal) =>
                (meal.photos ?? []).map((uri) => ({ uri, mealId: meal.id })),
              )
              .filter((photo) => !failedPhotos.has(photo.uri));

            return (
              <View key={type} style={s.mealCard}>
                <Text style={s.mealGroupTitle}>{MEAL_TYPE_LABELS[type]}</Text>
                {meals.map((m) => (
                  <View key={m.id} style={s.mealItem}>
                    <Text style={s.mealName}>{m.description}</Text>
                    {m.calories != null && (
                      <Text style={s.meta}>{m.calories} kcal</Text>
                    )}
                  </View>
                ))}
                {attachments.length > 0 && (
                  <View style={s.attachments}>
                    <Text style={s.attachmentsTitle}>附件</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.attachmentList}
                    >
                      {attachments.map((photo, index) => (
                        <TouchableOpacity
                          key={`${photo.mealId}-${photo.uri}-${index}`}
                          onPress={() => setPreviewPhoto(photo.uri)}
                        >
                          <Image
                            source={{ uri: photo.uri }}
                            style={s.attachmentThumb}
                            onError={() => markPhotoFailed(photo.uri)}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
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
      {previewPhoto && (
        <Modal
          transparent
          visible={Boolean(previewPhoto)}
          animationType="fade"
          onRequestClose={() => setPreviewPhoto(null)}
        >
          <View style={s.previewBackdrop}>
            <TouchableOpacity
              style={s.previewClose}
              onPress={() => setPreviewPhoto(null)}
            >
              <Text style={s.previewCloseT}>关闭</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: previewPhoto }}
              style={s.previewImage}
              resizeMode="contain"
              onError={() => markPhotoFailed(previewPhoto)}
            />
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
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: colors.text,
  },
  rangeRow: { flexDirection: "row", marginBottom: 8 },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    marginBottom: spacing.large,
    ...shadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.medium,
  },
  cardTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  cardValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.medium,
  },
  summaryItem: {
    flex: 1,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.small,
    alignItems: "center",
  },
  summaryItemSpace: { marginLeft: spacing.small },
  summaryValue: { color: colors.text, fontWeight: "700", fontSize: 14 },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  chartBox: {
    width: "100%",
    height: 190,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 22,
    overflow: "hidden",
  },
  linePlot: { height: 150, position: "relative" },
  lineSegment: {
    position: "absolute",
    height: 3,
    borderRadius: 2,
  },
  pointWrap: {
    position: "absolute",
    width: 60,
    alignItems: "center",
  },
  pointValue: { height: 18, fontSize: 10, color: colors.textMuted },
  point: { width: 12, height: 12, borderRadius: 6 },
  pointLabel: {
    height: 20,
    marginTop: 4,
    fontSize: 10,
    color: colors.textMuted,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    marginRight: spacing.small,
  },
  chipA: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipT: { color: colors.textSecondary },
  chipTA: { color: colors.surface },
  dateField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    marginBottom: spacing.medium,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  dateChevron: { color: colors.primary, fontSize: 30, fontWeight: "800" },
  mealBox: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  detailHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.small,
    marginBottom: spacing.small,
  },
  subTitle: {
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 4,
    color: colors.text,
  },
  detailMeta: { color: colors.textMuted, fontWeight: "600" },
  mealCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.medium,
  },
  mealGroupTitle: {
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.small,
    fontSize: 15,
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealName: { fontSize: 14, color: colors.text, flex: 1, paddingRight: 8 },
  meta: { fontSize: 12, color: colors.textSecondary },
  empty: { color: colors.textMuted },
  attachments: {
    marginTop: spacing.small,
    paddingTop: spacing.small,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachmentsTitle: {
    fontWeight: "800",
    color: colors.textSecondary,
    marginBottom: spacing.small,
    fontSize: 13,
  },
  attachmentList: {
    flexDirection: "row",
    gap: spacing.small,
    paddingRight: spacing.medium,
  },
  attachmentThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSoft,
  },
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
    gap: spacing.small,
    marginTop: spacing.large,
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.page,
  },
  previewClose: {
    position: "absolute",
    top: 42,
    right: 20,
    zIndex: 1,
    borderRadius: radius.input,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewCloseT: {
    color: colors.surface,
    fontWeight: "700",
  },
  previewImage: {
    width: "100%",
    height: "82%",
  },
});
