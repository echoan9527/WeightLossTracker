import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { getMealsByDate } from '../db/mealsRepository';
import { insertWeight, getAllWeights } from '../db/weightsRepository';
import AddMealModal from './AddMealModal';

const today = () => new Date().toISOString().slice(0, 10);

export default function TodayScreen() {
  const { todayMeals, setTodayMeals, todayWeight, setTodayWeight,
          setAllWeights, addMeal } = useAppStore();
  const [weightInput, setWeightInput] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getMealsByDate(today()).then(setTodayMeals);
  }, []);

  async function saveWeight() {
    const val = parseFloat(weightInput);
    if (isNaN(val)) return Alert.alert('请输入有效体重');
    await insertWeight(today(), val);
    const all = await getAllWeights();
    setAllWeights(all);
    setTodayWeight({ id: 0, date: today(), weight: val, created_at: '' });
    setWeightInput('');
  }

  const groups = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  return (
    <View style={s.container}>
      <Text style={s.date}>{today()}</Text>
      <View style={s.row}>
        <TextInput style={s.input} placeholder="今日体重 (kg)" keyboardType="numeric"
          value={weightInput} onChangeText={setWeightInput} />
        <TouchableOpacity style={s.btn} onPress={saveWeight}><Text style={s.btnT}>保存</Text></TouchableOpacity>
      </View>
      {todayWeight && <Text style={s.current}>当前：{todayWeight.weight} kg</Text>}
      {groups.map(g => {
        const items = todayMeals.filter(m => m.meal_type === g);
        return (
          <View key={g}>
            <Text style={s.group}>{g}</Text>
            {items.map(m => <Text key={m.id} style={s.item}>{m.description}</Text>)}
          </View>
        );
      })}
      <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
        <Text style={s.addT}>+ 添加饮食</Text>
      </TouchableOpacity>
      <AddMealModal visible={showModal} onClose={() => setShowModal(false)}
        onSaved={(meal) => { addMeal(meal); setShowModal(false); }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  date: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 },
  btn: { backgroundColor: '#2e86de', borderRadius: 6, padding: 8, marginLeft: 8, justifyContent: 'center' },
  btnT: { color: '#fff' },
  current: { marginBottom: 8, color: '#555' },
  group: { fontWeight: 'bold', marginTop: 12, textTransform: 'capitalize' },
  item: { paddingLeft: 8, paddingVertical: 2, color: '#333' },
  addBtn: { marginTop: 20, backgroundColor: '#2e86de', borderRadius: 8, padding: 14, alignItems: 'center' },
  addT: { color: '#fff', fontSize: 16 },
});
