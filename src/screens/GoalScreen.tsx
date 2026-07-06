import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { upsertGoal, getLatestGoal } from '../db/goalsRepository';
import { calculateProgress, estimateCompletionDate } from '../utils/goalCalculations';

export default function GoalScreen() {
  const { currentGoal, setCurrentGoal, allWeights } = useAppStore();
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    getLatestGoal().then(g => { if (g) setCurrentGoal(g); });
  }, []);

  async function saveGoal() {
    const tw = parseFloat(targetWeight);
    if (isNaN(tw) || !targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('请输入有效的目标体重和日期 (YYYY-MM-DD)'); return;
    }
    await upsertGoal(tw, targetDate);
    const g = await getLatestGoal();
    setCurrentGoal(g);
  }

  const current = allWeights.length > 0 ? allWeights[allWeights.length - 1].weight : null;
  const start = allWeights.length > 0 ? allWeights[0].weight : null;
  const progress = current && start && currentGoal
    ? calculateProgress(current, start, currentGoal.target_weight) : null;
  const last7 = allWeights.slice(-7);
  const eta = current && currentGoal
    ? estimateCompletionDate(current, currentGoal.target_weight, last7) : null;

  return (
    <View style={s.container}>
      <Text style={s.title}>减重目标</Text>
      <Text style={s.label}>目标体重 (kg)</Text>
      <TextInput style={s.input} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight}
        placeholder={currentGoal ? String(currentGoal.target_weight) : '例：65'} />
      <Text style={s.label}>目标日期 (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={targetDate} onChangeText={setTargetDate}
        placeholder={currentGoal ? currentGoal.target_date : '例：2026-12-31'} />
      <TouchableOpacity style={s.btn} onPress={saveGoal}><Text style={s.btnT}>保存目标</Text></TouchableOpacity>

      {currentGoal && current && (
        <View style={s.card}>
          <Text style={s.cardTitle}>进度</Text>
          <Text>当前体重：{current} kg</Text>
          <Text>目标体重：{currentGoal.target_weight} kg</Text>
          {start && <Text>已减：{(start - current).toFixed(1)} kg，还差 {(current - currentGoal.target_weight).toFixed(1)} kg</Text>}
          {progress != null && <Text>进度：{progress}%</Text>}
          {eta && <Text>预计达成：{eta.toISOString().slice(0, 10)}</Text>}
          {!eta && last7.length >= 2 && <Text style={s.warn}>当前体重未下降，暂无预计日期</Text>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  btn: { backgroundColor: '#2e86de', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  btnT: { color: '#fff', fontSize: 16 },
  card: { marginTop: 24, backgroundColor: '#f0f8ff', borderRadius: 10, padding: 16, gap: 6 },
  cardTitle: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  warn: { color: '#e74c3c', marginTop: 4 },
});
