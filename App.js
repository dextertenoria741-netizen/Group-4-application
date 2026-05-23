// ====================================================
 // PROJECT: SchedEase - Class Scheduling System
 // UI CODE - Complete User Interface
 // ====================================================
 import React, { useState, useEffect } from 'react';
 import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
 import { initializeApp } from "firebase/app";
 import { getDatabase, ref, push, update, remove, onValue } from "firebase/database";
 import QRCodeScanner from 'react-native-qrcode-scanner';
 import { RNCamera } from 'react-native-camera';
 // 🔧 FIREBASE CONFIG
 const firebaseConfig = {
   apiKey: "YOUR_API_KEY",
   authDomain: "YOUR_AUTH_DOMAIN",
   databaseURL: "YOUR_DATABASE_URL",
   projectId: "YOUR_PROJECT_ID",
   storageBucket: "YOUR_STORAGE_BUCKET",
   messagingSenderId: "YOUR_SENDER_ID",
   appId: "YOUR_APP_ID"
 };
 const app = initializeApp(firebaseConfig);
 const db = getDatabase(app);
 export default function App() {
   // 📦 STATES
   const [subject, setSubject] = useState('');
   const [room, setRoom] = useState('');
   const [day, setDay] = useState('');
   const [time, setTime] = useState('');
   const [scheduleList, setScheduleList] = useState([]);
   const [editKey, setEditKey] = useState(null);
   const [scanMode, setScanMode] = useState(false);
   const [scannedData, setScannedData] = useState('');
   // Load Data from Firebase
   useEffect(() => {
     const scheduleRef = ref(db, 'schedules/');
     onValue(scheduleRef, (snapshot) => {
       const data = snapshot.val();
       let schedules = [];
       if (data) {
         Object.keys(data).map(key => schedules.push({ id: key, ...data[key] }));
       }
       setScheduleList(schedules);
     });
   }, []);
   // Add New Schedule
   const addSchedule = () => {
     if (!subject || !room || !day || !time) {
       Alert.alert("Error", "Fill all fields!");
       return;
     }
     push(ref(db, 'schedules/'), { subject, room, day, time });
     setSubject(''); setRoom(''); setDay(''); setTime('');
     Alert.alert("Success", "Schedule Added!");
   };
   // Update Schedule
   const startEdit = (item) => {
     setSubject(item.subject);
     setRoom(item.room);
     setDay(item.day);
     setTime(item.time);
     setEditKey(item.id);
   };
   const saveUpdate = () => {
     if (!subject || !room || !day || !time) {
       Alert.alert("Error", "Fill all fields!");
       return;
     }
     update(ref(db, `schedules/${editKey}`), { subject, room, day, time });
     setSubject(''); setRoom(''); setDay(''); setTime(''); setEditKey(null);
     Alert.alert("Updated", "Schedule saved!");
   };
   // Delete Schedule
   const deleteSchedule = (id) => {
     Alert.alert("Delete?", "Remove this schedule?", [
       { text: "Cancel", style: "cancel" },
       { text: "Delete", style: "destructive", onPress: () => remove(ref(db, `schedules/${id}`)) }
     ]);
   };
   // QR Scanner Logic
   const onScanSuccess = (e) => {
     setScanMode(false);
     const result = e.data;
     setScannedData(result);
     if (!result || result.trim() === '') {
       Alert.alert("⚠️ Scan Failed", "QR Code is empty or invalid");
       return;
     }
     try {
       const qrData = JSON.parse(result);
       setSubject(qrData.subject || '');
       setRoom(qrData.room || '');
       setDay(qrData.day || '');
       setTime(qrData.time || '');
       Alert.alert("✅ Scanned!", "Data loaded automatically!");
     } catch {
       Alert.alert("✅ Scanned Result", result);
     }
   };
   // ====================================================
   // SCANNER SCREEN UI
   // ====================================================
   if (scanMode) {
     return (
       <View style={styles.scannerContainer}>
         <QRCodeScanner
           onRead={onScanSuccess}
           flashMode={RNCamera.Constants.FlashMode.auto}
           topContent={<Text style={styles.scannerText}>Scan Schedule QR Code</Text>}
           bottomContent={
             <TouchableOpacity style={styles.cancelButton} onPress={() => setScanMode(false)}>
               <Text style={styles.cancelText}>CANCEL</Text>
             </TouchableOpacity>
           }
         />
       </View>
     );
   }
   // ====================================================
   // MAIN SCREEN UI
   // ====================================================
   return (
     <View style={styles.container}>
       {/* Header */}
       <Text style={styles.headerTitle}>📅 SchedEase</Text>
       <Text style={styles.subHeaderTitle}>Class Scheduling System</Text>
       {/* Scan QR Button */}
       <TouchableOpacity style={styles.scanButton} onPress={() => setScanMode(true)}>
         <Text style={styles.scanButtonText}>📷 SCAN QR CODE</Text>
       </TouchableOpacity>
       {/* Scanned Result Display */}
       {scannedData ? (
         <View style={styles.resultBox}>
           <Text style={styles.resultLabel}>Last Scanned:</Text>
           <Text style={styles.resultText} numberOfLines={1}>{scannedData}</Text>
         </View>
       ) : null}
       {/* Input Fields */}
       <TextInput
         style={styles.inputField}
         placeholder="Subject"
         value={subject}
         onChangeText={setSubject}
         placeholderTextColor="#94A3B8"
       />
       <TextInput
         style={styles.inputField}
         placeholder="Room / Location"
         value={room}
         onChangeText={setRoom}
         placeholderTextColor="#94A3B8"
       />
       <TextInput
         style={styles.inputField}
         placeholder="Day (e.g. Monday)"
         value={day}
         onChangeText={setDay}
         placeholderTextColor="#94A3B8"
       />
       <TextInput
         style={styles.inputField}
         placeholder="Time (e.g. 7:30 AM)"
         value={time}
         onChangeText={setTime}
         placeholderTextColor="#94A3B8"
       />
       {/* Add / Update Button */}
       {editKey ? (
         <Button
           title="✅ Save Changes"
           color="#2196F3"
           onPress={saveUpdate}
         />
       ) : (
         <Button
           title="➕ Add New Schedule"
           color="#4CAF50"
           onPress={addSchedule}
         />
       )}
       {/* Saved Schedules List */}
       <Text style={styles.sectionTitle}>📋 Saved Schedules</Text>
       <FlatList
         data={scheduleList}
         keyExtractor={(item) => item.id}
         showsVerticalScrollIndicator={false}
         renderItem={({ item }) => (
           <View style={styles.scheduleCard}>
             <Text style={styles.cardSubject}>📌 {item.subject}</Text>
             <Text style={styles.cardDetails}>🏫 {item.room} | 🗓️ {item.day} ⏰ {item.time}</Text>
             <View style={styles.cardButtons}>
               <Button
                 title="✏️ Edit"
                 color="#FF9800"
                 onPress={() => startEdit(item)}
               />
               <Button
                 title="❌ Delete"
                 color="#F44336"
                 onPress={() => deleteSchedule(item.id)}
               />
             </View>
           </View>
         )}
       />
     </View>
   );
 }
 // ====================================================
 // STYLE SHEET - Complete UI Design
 // ====================================================
 const styles = StyleSheet.create({
   // Main Container
   container: {
     flex: 1,
     padding: 20,
     backgroundColor: '#FAFAFA',
     marginTop: 30
   },
   // Header Text
   headerTitle: {
     fontSize: 28,
     fontWeight: 'bold',
     textAlign: 'center',
     color: '#1A1A1A',
     letterSpacing: 0.5
   },
   subHeaderTitle: {
     fontSize: 16,
     textAlign: 'center',
     color: '#64748B',
     marginBottom: 20
   },
   // Scan Button
   scanButton: {
     backgroundColor: '#8E24AA',
     padding: 14,
     borderRadius: 10,
     alignItems: 'center',
     marginBottom: 12,
     elevation: 2
   },
   scanButtonText: {
     color: '#FFFFFF',
     fontWeight: 'bold',
     fontSize: 15
   },
   // Scanned Result Box
   resultBox: {
     backgroundColor: '#E3F2FD',
     padding: 12,
     borderRadius: 8,
     marginBottom: 12,
     borderWidth: 1,
     borderColor: '#BBDEFB'
   },
   resultLabel: {
     fontWeight: 'bold',
     color: '#1976D2',
     fontSize: 14
   },
   resultText: {
     color: '#334155',
     fontSize: 14,
     marginTop: 2
   },
   // Input Fields
   inputField: {
     borderWidth: 1,
     borderColor: '#E2E8F0',
     borderRadius: 10,
     padding: 12,
     marginVertical: 6,
     backgroundColor: '#FFFFFF',
     fontSize: 15,
     color: '#334155'
   },
   // Section Title
   sectionTitle: {
     fontSize: 19,
     fontWeight: 'bold',
     marginTop: 24,
     marginBottom: 12,
     color: '#2D3748'
   },
   // Schedule Card
   scheduleCard: {
     backgroundColor: '#FFFFFF',
     padding: 16,
     borderRadius: 12,
     marginVertical: 6,
     borderLeftWidth: 5,
     borderLeftColor: '#4CAF50',
     elevation: 2,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.1,
     shadowRadius: 3
   },
   cardSubject: {
     fontSize: 16,
     fontWeight: '600',
     color: '#1A1A1A',
     marginBottom: 4
   },
   cardDetails: {
     fontSize: 14,
     color: '#64748B',
     marginBottom: 10
   },
   cardButtons: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginTop: 5
   },
   // Scanner Screen
   scannerContainer: {
     flex: 1,
     backgroundColor: '#000000'
   },
   scannerText: {
     fontSize: 18,
     color: '#FFFFFF',
     fontWeight: '600',
     textAlign: 'center',
     margin: 24
   },
   cancelButton: {
     backgroundColor: '#D32F2F',
     padding: 14,
     borderRadius: 10,
     width: 140,
     alignItems: 'center',
     marginTop: 15,
     marginBottom: 30,
     alignSelf: 'center',
     elevation: 2
   },
   cancelText: {
     color: '#FFFFFF',
     fontWeight: 'bold',
     fontSize: 15
   }
 });
