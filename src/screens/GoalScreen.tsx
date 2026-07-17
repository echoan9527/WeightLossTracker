import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "../store/useAppStore";
import { upsertGoal, getLatestGoal } from "../db/goalsRepository";
import {
  calculateProgress,
  estimateCompletionDate,
} from "../utils/goalCalculations";
import { colors, spacing, radius, shadow } from "../styles/theme";

export default function GoalScreen() {
  const { currentGoal, setCurrentGoal, allWeights } = useAppStore();
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    getLatestGoal().then((g) => {
      if (g) setCurrentGoal(g);
    });
  }, []);

  async function saveGoal() {
    const tw = parseFloat(targetWeight);
    if (isNaN(tw) || !targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("请输入有效的目标体重和日期 (YYYY-MM-DD)");
      return;
    }
    await upsertGoal(tw, targetDate);
    const g = await getLatestGoal();
    setCurrentGoal(g);
    setTargetWeight("");
    setTargetDate("");
    setEditingGoal(false);
  }

  const current =
    allWeights.length > 0 ? allWeights[allWeights.length - 1].weight : null;
  const start = allWeights.length > 0 ? allWeights[0].weight : null;
  const target = currentGoal?.target_weight ?? null;
  const remaining =
    current != null && target != null ? current - target : null;
  const lost =
    current != null && start != null ? start - current : null;
  const progress =
    current != null && start != null && currentGoal
      ? calculateProgress(current, start, currentGoal.target_weight)
      : null;
  const last7 = allWeights.slice(-7);
  const eta =
    current != null && currentGoal
      ? estimateCompletionDate(current, currentGoal.target_weight, last7)
      : null;
  const progressWidth = `${Math.max(
    0,
    Math.min(progress ?? 0, 100),
  )}%` as DimensionValue;
  const shouldShowEditor = editingGoal || !currentGoal;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.heroCard}>
        <View style={s.heroHeader}>
          <View style={s.heroTitleBlock}>
            <Text style={s.kicker}>减重目标</Text>
            <Text style={s.title}>
              {target != null ? `${target} kg` : "设置你的目标"}
            </Text>
          </View>
          <TouchableOpacity
            style={s.iconAction}
            onPress={() => {
              setTargetWeight(
                currentGoal ? String(currentGoal.target_weight) : "",
              );
              setTargetDate(currentGoal?.target_date ?? "");
              setEditingGoal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={currentGoal ? "编辑目标" : "设置目标"}
          >
            <Ionicons
              name={currentGoal ? "create-outline" : "add-outline"}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
        <View style={s.metricsRow}>
          <View style={s.metricItem}>
            <Text style={s.metricLabel}>当前</Text>
            <Text style={s.metricValue}>
              {current != null ? `${current} kg` : "--"}
            </Text>
          </View>
          <View style={s.metricDivider} />
          <View style={s.metricItem}>
            <Text style={s.metricLabel}>剩余</Text>
            <Text style={s.metricValue}>
              {remaining != null ? `${Math.max(remaining, 0).toFixed(1)} kg` : "--"}
            </Text>
          </View>
          <View style={s.metricDivider} />
          <View style={s.metricItem}>
            <Text style={s.metricLabel}>截止</Text>
            <Text style={s.metricValueSmall}>
              {currentGoal?.target_date ?? "--"}
            </Text>
          </View>
        </View>
      </View>

      {currentGoal && current != null ? (
        <View style={s.progressCard}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>目标进度</Text>
              <Text style={s.sectionHint}>
                {lost != null
                  ? `${lost >= 0 ? "已减" : "较初始增加"} ${Math.abs(
                      lost,
                    ).toFixed(1)} kg`
                  : "记录体重后会显示进度"}
              </Text>
            </View>
            <Text style={s.progressPct}>{progress ?? 0}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: progressWidth }]} />
          </View>
          {eta ? (
            <View style={s.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={s.infoText}>
                预计达成 {eta.toISOString().slice(0, 10)}
              </Text>
            </View>
          ) : last7.length >= 2 ? (
            <View style={s.warnBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={colors.danger}
              />
              <Text style={s.warnText}>当前趋势下暂无预计日期</Text>
            </View>
          ) : (
            <View style={s.infoRow}>
              <Ionicons
                name="scale-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={s.infoText}>继续记录体重后会估算达成日期</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.emptyState}>
          <Ionicons name="flag-outline" size={28} color={colors.gray} />
          <Text style={s.emptyTitle}>还没有目标</Text>
          <Text style={s.emptyText}>设置目标体重和日期后，会在这里追踪进度。</Text>
        </View>
      )}

      {shouldShowEditor && (
        <View style={s.formCard}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>
                {currentGoal ? "调整目标" : "设置目标"}
              </Text>
              <Text style={s.sectionHint}>目标日期格式：YYYY-MM-DD</Text>
            </View>
            {currentGoal && (
              <TouchableOpacity
                style={s.closeEdit}
                onPress={() => setEditingGoal(false)}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>目标体重</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder={
                currentGoal ? String(currentGoal.target_weight) : "例如 65"
              }
            />
          </View>
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>目标日期</Text>
            <TextInput
              style={s.input}
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder={currentGoal ? currentGoal.target_date : "例如 2026-12-31"}
            />
          </View>
          <TouchableOpacity style={s.btn} onPress={saveGoal}>
            <Text style={s.btnT}>保存目标</Text>
          </TouchableOpacity>
        </View>
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    marginBottom: spacing.medium,
    ...shadow,
  },
  heroHeader: {
    minHeight: 68,
    marginBottom: spacing.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.small,
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    color: colors.text,
  },
  iconAction: {
    width: 42,
    height: 42,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    flexShrink: 0,
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
  metricValueSmall: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    marginBottom: spacing.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.medium,
    gap: spacing.small,
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
  progressPct: {
    color: colors.primary,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  infoRow: {
    marginTop: spacing.medium,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.input,
    padding: spacing.small,
  },
  infoText: {
    marginLeft: spacing.xsmall,
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  warnBox: {
    marginTop: spacing.medium,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff1f0",
    borderRadius: radius.input,
    padding: spacing.small,
  },
  warnText: {
    marginLeft: spacing.xsmall,
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
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
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeEdit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
    flexShrink: 0,
  },
  inputGroup: {
    marginTop: spacing.small,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginBottom: spacing.xsmall,
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
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.medium,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.medium,
  },
  btnT: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
