import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { getAllWeights } from '../db/weightsRepository';
import { getMealsByDate, getMealsByDateRange } from '../db/mealsRepository';
import { Meal, Weight } from '../types';

const W = Dimensions.get('window').width - 32;
type Range = '7d' | '30d' | 'all';
type ChartPoint = { label: string; value: number };

function getLatestWeightsByDate(weights: Weight[]) {
  const byDate = new Map<string, Weight>();
  weights.forEach(weight => {
    const current = byDate.get(weight.date);
    if (!current || weight.id > current.id) byDate.set(weight.date, weight);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
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
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const chartWidth = W - 24;
  const chartHeight = 126;
  const points = data.map((d, index) => ({
    ...d,
    x: data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth,
    y: chartHeight - ((d.value - min) / range) * chartHeight,
  }));

  return (
    <View style={s.chartBox}>
      <View style={s.linePlot}>
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
          const showLabel = data.length <= 8 || index % Math.ceil(data.length / 6) === 0;

          return (
            <View
              key={`${point.label}-${index}`}
              style={[s.pointWrap, { left: point.x - 30, top: point.y - 24 }]}
            >
              <Text style={s.pointValue}>
                {point.value > 0 ? `${point.value}${valueSuffix}` : ''}
              </Text>
              <View style={[s.point, { backgroundColor: color }]} />
              <Text style={s.pointLabel}>{showLabel ? point.label : ''}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { allWeights, setAllWeights } = useAppStore();
  const [range, setRange] = useState<Range>('7d');
  const [selectedDate, setSelectedDate] = useState('');
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [calByDate, setCalByDate] = useState<Record<string, number>>({});

  useEffect(() => { getAllWeights().then(setAllWeights); }, []);

  const latestWeights = getLatestWeightsByDate(allWeights);
  const cutoff = range === '7d' ? 7 : range === '30d' ? 30 : latestWeights.length;
  const filtered = latestWeights.slice(-cutoff);

  useEffect(() => {
    if (filtered.length === 0) return;
    const from = filtered[0].date;
    const to = filtered[filtered.length - 1].date;
    getMealsByDateRange(from, to).then(meals => {
      const map: Record<string, number> = {};
      meals.forEach(m => { map[m.date] = (map[m.date] ?? 0) + (m.calories ?? 0); });
      setCalByDate(map);
    });
  }, [range, latestWeights.length]);

  const weightData = filtered.map(w => ({ label: w.date.slice(5), value: w.weight }));
  const calData = filtered.map(w => ({ label: w.date.slice(5), value: calByDate[w.date] ?? 0 }));

  async function selectDate(date: string) {
    setSelectedDate(date);
    const meals = await getMealsByDate(date);
    setDayMeals(meals);
  }

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>体重趋势</Text>
      <View style={s.rangeRow}>
        {(['7d', '30d', 'all'] as Range[]).map(r => (
          <TouchableOpacity key={r} style={[s.chip, range === r && s.chipA]} onPress={() => setRange(r)}>
            <Text style={range === r ? s.chipTA : s.chipT}>{r === 'all' ? '全部' : r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {weightData.length > 0 && (
        <MiniLineChart data={weightData} color="#2e86de" valueSuffix="kg" />
      )}
      <Text style={s.title}>每日热量 (kcal)</Text>
      {calData.length > 0 && (
        <MiniLineChart data={calData} color="#e67e22" valueSuffix="" />
      )}
      <Text style={s.title}>查看某日饮食</Text>
      {filtered.map(w => (
        <TouchableOpacity key={w.date} style={[s.dayRow, selectedDate === w.date && s.dayRowA]}
          onPress={() => selectDate(w.date)}>
          <Text>{w.date}  {w.weight} kg</Text>
        </TouchableOpacity>
      ))}
      {selectedDate !== '' && (
        <View style={s.mealBox}>
          <Text style={s.subTitle}>{selectedDate} 饮食</Text>
          {dayMeals.length === 0
            ? <Text style={s.empty}>暂无记录</Text>
            : dayMeals.map(m => (
              <View key={m.id} style={s.mealItem}>
                <Text style={s.mealName}>{m.meal_type} — {m.description}</Text>
                {m.calories != null && <Text style={s.meta}>{m.calories} kcal</Text>}
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chartBox: { width: W, height: 190, marginBottom: 16, paddingHorizontal: 12, paddingTop: 22 },
  linePlot: { width: W - 24, height: 150, position: 'relative' },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
  },
  pointWrap: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  pointValue: { height: 18, fontSize: 10, color: '#667085' },
  point: { width: 12, height: 12, borderRadius: 6 },
  pointLabel: { height: 20, marginTop: 4, fontSize: 10, color: '#667085' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipA: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  chipT: { color: '#333' }, chipTA: { color: '#fff' },
  dayRow: { padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  dayRowA: { backgroundColor: '#e8f4fd' },
  mealBox: { marginTop: 12, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12 },
  subTitle: { fontWeight: 'bold', marginBottom: 6 },
  mealItem: { paddingVertical: 4 },
  mealName: { fontSize: 14 },
  meta: { fontSize: 12, color: '#888' },
  empty: { color: '#aaa' },
});
