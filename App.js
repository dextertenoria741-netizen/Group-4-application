// ====================================================
 // PROJECT: SchedEase - Class Scheduling System
 // FEATURES: CRUD + QR Code Scanner (FIXED White Screen)
 // DATABASE: Firebase Realtime Database
 // SCANNER: react-native-qrcode-scanner
 // ====================================================
 import React, { useState, useEffect } from 'react';
 import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
 import { initializeApp } from "firebase/app";
 import { getDatabase, ref, push, get, update, remove, onValue } from "firebase/database";
 // 🆕 IMPORT FOR QR SCANNER
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
 // Initialize Firebase
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
   
   // 🆕 QR SCANNER STATES
   const [scanMode, setScanMode] = useState(false); // Controls scanner screen
   const [scannedData, setScannedData] = useState(''); // Stores result
   // ====================================================
   // ⚡ LOAD SCHEDULES FROM FIREBASE
   // ====================================================
   useEffect(() => {
     const scheduleRef = ref(db, 'schedules/');
     onValue(scheduleRef, (snapshot) => {
       const data = snapshot.val();
       let schedules = [];
       if (data) {
         Object.keys(data).forEach((key) => {
           schedules.push({ id: key, ...data[key] });
         });
       }
       setScheduleList(schedules);
     });
   }, []);
   // ====================================================
   // ➕ ADD NEW SCHEDULE
   // ====================================================
   const addSchedule = () => {
     if (!subject || !room || !day || !time) {
       Alert.alert("Error", "Fill all fields!");
       return;
     }
     push(ref(db, 'schedules/'), { subject, room, day, time });
     setSubject(''); setRoom(''); setDay(''); setTime('');
     Alert.alert("Success", "Schedule Added!");
   };
   // ====================================================
   // ✏️ UPDATE SCHEDULE
   // ====================================================
   const startEdit = (item) => {
     setSubject(item.subject);
     setRoom(item.room);
     setDay(item.day);
     setTime(item.time);
     setEditKey(item.id);
   };
   const saveUpdate = () => {
     if (!subject || !room || !day || !time) { Alert.alert("Error", "Fill all fields!"); return; }
     update(ref(db, `schedules/${editKey}`), { subject, room, day, time });
     setSubject(''); setRoom(''); setDay(''); setTime(''); setEditKey(null);
     Alert.alert("Updated", "Schedule saved!");
   };
   // ====================================================
   // ❌ DELETE SCHEDULE
   // ====================================================
   const deleteSchedule = (id) => {
     Alert.alert("Delete?", "Remove this schedule?", [
       {text:"Cancel", style:"cancel"},
       {text:"Delete", style:"destructive", onPress: () => remove(ref(db, `schedules/${id}`))}
     ]);
   };
   // ====================================================
   // 🆕 📷 QR SCANNER LOGIC — FIXED VERSION
   // ====================================================
   const onScanSuccess = (e) => {
     // ✅ FIX 1: Stop scanner immediately
     setScanMode(false);
     
     // ✅ FIX 2: Save data properly
     const result = e.data;
     setScannedData(result);
     // ✅ FIX 3: Check if data is valid / not empty
     if (!result || result.trim() === '') {
       Alert.alert("⚠️ Scan Failed", "QR Code is empty or invalid");
       return;
     }
     // ✅ OPTIONAL: If QR contains schedule data, auto-fill form
     try {
       // If QR = JSON like {"subject":"Math","room":"A1"}
       const qrData = JSON.parse(result);
       setSubject(qrData.subject || '');
       setRoom(qrData.room || '');
       setDay(qrData.day || '');
       setTime(qrData.time || '');
       Alert.alert("✅ Scanned!", "Data loaded automatically!");
     } catch (err) {
       // If QR is just plain text
       Alert.alert("✅ Scanned Result", result);
     }
   };
   // ====================================================
   // 🖥️ USER INTERFACE
   // ====================================================
   if (scanMode) {
     // 🆕 SCANNER SCREEN
     return (
       <View style={{flex:1}}>
         <QRCodeScanner
           onRead={onScanSuccess}
           flashMode={RNCamera.Constants.FlashMode.auto}
           topContent={<Text style={styles.scannerText}>Scan Schedule QR Code</Text>}
           bottomContent={
             <TouchableOpacity style={styles.cancelBtn} onPress={() => setScanMode(false)}>
               <Text style={{color:'white', fontWeight:'bold'}}>CANCEL</Text>
             </TouchableOpacity>
           }
         />
       </View>
     );
   }
   return (
     <View style={styles.container}>
       <Text style={styles.header}>📅 SchedEase</Text>
       {/* 🆕 SCAN BUTTON */}
       <TouchableOpacity style={styles.scanBtn} onPress={() => setScanMode(true)}>
         <Text style={{color:'white', fontWeight:'bold'}}>📷 SCAN QR CODE</Text>
       </TouchableOpacity>
       {/* 🆕 SHOW SCANNED RESULT (FIX for White Screen) */}
       {scannedData ? (
         <View style={styles.resultBox}>
           <Text style={{fontWeight:'bold'}}>Last Scanned:</Text>
           <Text numberOfLines={1}>{scannedData}</Text>
         </View>
       ) : null}
       {/* --- INPUT FORM --- */}
       <TextInput style={styles.input} placeholder="Subject" value={subject} onChangeText={setSubject} />
       <TextInput style={styles.input} placeholder="Room" value={room} onChangeText={setRoom} />
       <TextInput style={styles.input} placeholder="Day" value={day} onChangeText={setDay} />
       <TextInput style={styles.input} placeholder="Time" value={time} onChangeText={setTime} />
       {editKey ? (
         <Button title="✅ Save Changes" color="#2196F3" onPress={saveUpdate} />
       ) : (
         <Button title="➕ Add New Schedule" color="#4CAF50" onPress={addSchedule} />
       )}
       <Text style={styles.subHeader}>📋 Saved Schedules</Text>
       {/* --- SCHEDULE LIST --- */}
       <FlatList
         data={scheduleList}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <View style={styles.card}>
             <Text>📌 {item.subject}</Text>
             <Text>🏫 {item.room} | 🗓️ {item.day} ⏰ {item.time}</Text>
             <View style={styles.actionButtons}>
               <Button title="✏️ Edit" color="#FF9800" onPress={() => startEdit(item)} />
               <Button title="❌ Delete" color="#f44336" onPress={() => deleteSchedule(item.id)} />
             </View>
           </View>
         )}
       />
     </View>
   );
 }
 // 🎨 STYLES
 const styles = StyleSheet.create({
   container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', marginTop:30 },
   header: { fontSize:26, fontWeight:'bold', textAlign:'center', marginBottom:10 },
   scanBtn: { backgroundColor:'#9C27B0', padding:12, borderRadius:8, alignItems:'center', marginBottom:10 },
   resultBox: { backgroundColor:'#E3F2FD', padding:8, borderRadius:5, marginBottom:10 },
   input: { borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginVertical:5, backgroundColor:'#fff' },
   subHeader: { fontSize:18, fontWeight:'bold', marginTop:20, marginBottom:10 },
   card: { backgroundColor:'#fff', padding:15, borderRadius:8, marginVertical:5, borderLeftWidth:5, borderLeftColor:'#4CAF50' },
   actionButtons: { flexDirection:'row', justifyContent:'space-between', marginTop:8 },
   scannerText: { fontSize:18, color:'white', textAlign:'center', margin:20 },
   cancelBtn: { backgroundColor:'red', padding:12, borderRadius:8, width:120, alignItems:'center', marginTop:10 }
 });
