import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity,
         ScrollView, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { insertMeal, getMealsByDate } from '../db/mealsRepository';
import { useAppStore } from '../store/useAppStore';
import { Meal, MealMode, MealType } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
const MODES: { id: MealMode; label: string }[] = [
  { id: 'A', label: 'A — 仅文字' }, { id: 'B', label: 'B — 文字+热量' }, { id: 'C', label: 'C — 文字+宏量' }
];

interface Props { visible: boolean; onClose(): void; onSaved(meal: Meal): void; }

export default function AddMealModal({ visible, onClose, onSaved }: Props) {
  const { setTodayMeals } = useAppStore();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [mode, setMode] = useState<MealMode>('A');
  const [desc, setDesc] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相册权限', '请在系统设置中开启相册访问权限'); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
    if (!result.canceled) setPhotos(p => [...p, ...result.assets.map(a => a.uri)]);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要相机权限', '请在系统设置中开启相机权限'); return;
    }
    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled) setPhotos(p => [...p, result.assets[0].uri]);
  }

  async function handleSave() {
    if (!desc.trim()) { Alert.alert('请输入食物描述'); return; }
    await insertMeal({
      date: today(), meal_type: mealType, description: desc.trim(), mode,
      calories: mode !== 'A' ? parseInt(calories) || undefined : undefined,
      protein: mode === 'C' ? parseFloat(protein) || undefined : undefined,
      carbs: mode === 'C' ? parseFloat(carbs) || undefined : undefined,
      fat: mode === 'C' ? parseFloat(fat) || undefined : undefined,
      photos,
    });
    const meals = await getMealsByDate(today());
    setTodayMeals(meals);
    onSaved(meals[meals.length - 1]);
    setDesc(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setPhotos([]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={s.container}>
        <Text style={s.title}>添加饮食</Text>
        <Text style={s.label}>餐次</Text>
        <View style={s.row}>{MEAL_TYPES.map(t => (
          <TouchableOpacity key={t} style={[s.chip, mealType === t && s.chipActive]} onPress={() => setMealType(t)}>
            <Text style={mealType === t ? s.chipTxtA : s.chipTxt}>{MEAL_LABELS[t]}</Text>
          </TouchableOpacity>
        ))}</View>
        <Text style={s.label}>记录模式</Text>
        {MODES.map(m => (
          <TouchableOpacity key={m.id} style={[s.chip, mode === m.id && s.chipActive]} onPress={() => setMode(m.id)}>
            <Text style={mode === m.id ? s.chipTxtA : s.chipTxt}>{m.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.label}>描述</Text>
        <TextInput style={s.input} placeholder="食物描述" value={desc} onChangeText={setDesc} />
        {mode !== 'A' && <><Text style={s.label}>热量 (kcal)</Text>
          <TextInput style={s.input} keyboardType="numeric" value={calories} onChangeText={setCalories} /></>}
        {mode === 'C' && <>
          <Text style={s.label}>蛋白质 (g)</Text>
          <TextInput style={s.input} keyboardType="numeric" value={protein} onChangeText={setProtein} />
          <Text style={s.label}>碳水 (g)</Text>
          <TextInput style={s.input} keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
          <Text style={s.label}>脂肪 (g)</Text>
          <TextInput style={s.input} keyboardType="numeric" value={fat} onChangeText={setFat} />
        </>}
        <Text style={s.label}>照片</Text>
        <View style={s.row}>
          <TouchableOpacity style={s.photoBtn} onPress={takePhoto}><Text>拍照</Text></TouchableOpacity>
          <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}><Text>从相册选</Text></TouchableOpacity>
        </View>
        <View style={s.row}>{photos.map((uri, i) => <Image key={i} source={{ uri }} style={s.thumb} />)}</View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}><Text style={s.saveTxt}>保存</Text></TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose}><Text>取消</Text></TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  chipTxt: { color: '#333' }, chipTxtA: { color: '#fff' },
  photoBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10 },
  thumb: { width: 64, height: 64, borderRadius: 4 },
  saveBtn: { backgroundColor: '#2e86de', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  saveTxt: { color: '#fff', fontSize: 16 },
  cancelBtn: { padding: 14, alignItems: 'center' },
});
