import React from 'react';
import { Modal, View, Text } from 'react-native';
import { Meal } from '../types';
interface Props { visible: boolean; onClose(): void; onSaved(meal: Meal): void; }
export default function AddMealModal({ visible, onClose }: Props) {
  return <Modal visible={visible} onRequestClose={onClose}><View><Text>Coming soon</Text></View></Modal>;
}
