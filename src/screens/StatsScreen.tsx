import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryBar, VictoryAxis } from 'victory-native';
import { useAppStore } from '../store/useAppStore';
import { getAllWeights } from '../db/weightsRepository';
import { getMealsByDate, getMealsByDateRange } from '../db/mealsRepository';
import { Meal } from '../types';

const W = Dimensions.get('window').width - 32;
type Range = '7d' | '30d' | 'all';

export default function StatsScreen() {
  const { allWeights, setAllWeights } = useAppStore();
  const [range, setRange] = useState<Range>('7d');
  const [selectedDate, setSelectedDate] = useState('');
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [calByDate, setCalByDate] = useState<Record<string, number>>({});

  useEffect(() => { getAllWeights().then(setAllWeights); }, []);

  const cutoff = range === '7d' ? 7 : range === '30d' ? 30 : 9999;
  const filtered = allWeights.slice(-cutoff);

  useEffect(() => {
    if (filtered.length === 0) return;
    const from = filtered[0].date;
    const to = filtered[filtered.length - 1].date;
    getMealsByDateRange(from, to).then(meals => {
      const map: Record<string, number> = {};
      meals.forEach(m => { map[m.date] = (map[m.date] ?? 0) + (m.calories ?? 0); });
      setCalByDate(map);
    });
  }, [range, allWeights.length]);

  const weightData = filtered.map(w => ({ x: w.date.slice(5), y: w.weight }));
  const calData = filtered.map(w => ({ x: w.date.slice(5), y: calByDate[w.date] ?? 0 }));

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
        <VictoryChart width={W} height={220}>
          <VictoryAxis tickFormat={(t) => t} style={{ tickLabels: { fontSize: 9, angle: -30 } }} />
          <VictoryAxis dependentAxis />
          <VictoryLine data={weightData} style={{ data: { stroke: '#2e86de' } }} />
        </VictoryChart>
      )}
      <Text style={s.title}>每日热量 (kcal)</Text>
      {calData.length > 0 && (
        <VictoryChart width={W} height={180}>
          <VictoryAxis tickFormat={(t) => t} style={{ tickLabels: { fontSize: 9, angle: -30 } }} />
          <VictoryAxis dependentAxis />
          <VictoryBar data={calData} style={{ data: { fill: '#e67e22' } }} />
        </VictoryChart>
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
