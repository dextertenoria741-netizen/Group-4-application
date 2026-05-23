import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from './firebaseConfig';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  // --------------------------
  // 🔐 AUTH STATE
  // --------------------------
  const [user, setUser] = useState(undefined);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setSchedules([]);
        return;
      }
      setUser({ uid: firebaseUser.uid, email: firebaseUser.email || '' });
    });

    return () => unsub();
  }, []);


  // --------------------------
  // 🔐 AUTH FUNCTIONS
  // --------------------------
  const registerUser = async () => {
    try {
      if (!email || !password) return { success: false, message: 'Fill all fields' };
      if (password.length < 6)
        return { success: false, message: 'Password min 6 characters' };

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, message: 'Account created successfully', uid: cred.user.uid };
    } catch (err) {
      return { success: false, message: err?.message || 'Registration failed' };
    }
  };

  const loginUser = async () => {
    try {
      if (!email || !password) return { success: false, message: 'Fill all fields' };
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true, message: 'Login successful' };
    } catch (err) {
      return { success: false, message: err?.message || 'Login failed' };
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      setEmail('');
      setPassword('');
      setCurrentScreen('home');
      setSchedules([]);
      return { success: true };
    } catch (err) {
      return { success: false, message: err?.message || 'Logout failed' };
    }
  };

  // --------------------------
  // 📱 SCREEN NAVIGATION STATE
  // --------------------------
  const [currentScreen, setCurrentScreen] = useState('home');

  // --------------------------
  // 📅 SCHEDULE DATA STATE
  // --------------------------
  const [schedules, setSchedules] = useState([]);

  // --------------------------
  // 🔄 FIRESTORE SUBSCRIPTION
  // --------------------------
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'users', user.uid, 'schedules'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          subject: data.subject,
          room: data.room,
          day: data.day,
          time: data.time,
          userId: data.userId,
          createdAt: data.createdAt,
        };
      });
      setSchedules(items);
    });

    return () => unsub();
  }, [user?.uid]);


  // --------------------------
  // ADD FORM STATE
  // --------------------------
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');

  // --------------------------
  // EDIT STATE
  // --------------------------
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    subject: '',
    room: '',
    day: '',
    time: ''
  });

  // --------------------------
  // ➕ ADD SCHEDULE
  // --------------------------
  const addNewSchedule = async () => {
    try {
      if (!user) return { success: false, message: 'Please login first' };
      if (!subject || !room || !day || !time)
        return { success: false, message: 'Fill all fields' };

      const schedulesRef = collection(db, 'users', user.uid, 'schedules');
      await addDoc(schedulesRef, {
        subject,
        room,
        day,
        time,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setSubject('');
      setRoom('');
      setDay('');
      setTime('');
      return { success: true, message: 'Schedule added successfully' };
    } catch (err) {
      return { success: false, message: err?.message || 'Add failed' };
    }
  };

  // --------------------------
  // ✏️ EDIT SCHEDULE
  // --------------------------
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({
      subject: item.subject,
      room: item.room,
      day: item.day,
      time: item.time
    });
  };

  const saveEditChanges = async () => {
    try {
      if (!editingId || !user) return { success: false };

      const scheduleDocRef = doc(db, 'users', user.uid, 'schedules', editingId);
      await updateDoc(scheduleDocRef, {
        ...editData,
      });

      setEditingId(null);
      return { success: true, message: 'Schedule updated successfully' };
    } catch (err) {
      return { success: false, message: err?.message || 'Update failed' };
    }
  };

  // --------------------------
  // 🗑 DELETE SCHEDULE
  // --------------------------
  const deleteSchedule = async (id) => {
    try {
      if (!user) return { success: false };
      const scheduleDocRef = doc(db, 'users', user.uid, 'schedules', id);
      await deleteDoc(scheduleDocRef);
      return { success: true, message: 'Schedule deleted successfully' };
    } catch (err) {
      return { success: false, message: err?.message || 'Delete failed' };
    }
  };

  const handleAuthSubmit = async () => {
    const result = authMode === 'login' ? await loginUser() : await registerUser();
    setMessage(result.message || (result.success ? 'Success' : 'Something went wrong'));

    if (result.success && authMode === 'register') {
      setAuthMode('login');
      setPassword('');
    }
  };

  const handleAddSchedule = async () => {
    const result = await addNewSchedule();
    setMessage(result.message || (result.success ? 'Success' : 'Something went wrong'));

    if (result.success) {
      setCurrentScreen('home');
    }
  };

  const handleSaveSchedule = async () => {
    const result = await saveEditChanges();
    setMessage(result.message || (result.success ? 'Success' : 'Something went wrong'));

    if (result.success) {
      setCurrentScreen('home');
    }
  };

  const handleDeleteSchedule = async (id) => {
    const result = await deleteSchedule(id);
    setMessage(result.message || (result.success ? 'Success' : 'Something went wrong'));
  };

  const goToAddScreen = () => {
    setSubject('');
    setRoom('');
    setDay('');
    setTime('');
    setEditingId(null);
    setMessage('');
    setCurrentScreen('add');
  };

  const goToEditScreen = (item) => {
    startEdit(item);
    setMessage('');
    setCurrentScreen('edit');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCurrentScreen('home');
  };

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const scheduleCount = schedules.length;
  const nextSchedule = schedules[0];
  const userInitial = user?.email?.charAt(0)?.toUpperCase() || 'S';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Modern Planner</Text>
            </View>
            <Text style={styles.heroDate}>{todayLabel}</Text>
          </View>

          <Text style={styles.heroTitle}>SchedEase</Text>
          <Text style={styles.heroSubtitle}>
            Organize classes, rooms, and time blocks with a cleaner student dashboard.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{user ? scheduleCount : '--'}</Text>
              <Text style={styles.heroStatLabel}>Schedules</Text>
            </View>

            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{user ? currentScreen : 'Auth'}</Text>
              <Text style={styles.heroStatLabel}>Current View</Text>
            </View>

            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{user ? (nextSchedule ? 'Ready' : 'Empty') : 'Guest'}</Text>
              <Text style={styles.heroStatLabel}>Status</Text>
            </View>
          </View>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Get started</Text>
              <Text style={styles.cardTitle}>Access your SchedEase workspace</Text>
              <Text style={styles.sectionText}>
                Sign in to manage class schedules or create a new account to start planning.
              </Text>
            </View>

            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentButton, authMode === 'login' && styles.segmentButtonActive]}
                onPress={() => {
                  setAuthMode('login');
                  setMessage('');
                }}
              >
                <Text style={[styles.segmentButtonText, authMode === 'login' && styles.segmentButtonTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentButton, authMode === 'register' && styles.segmentButtonActive]}
                onPress={() => {
                  setAuthMode('register');
                  setMessage('');
                }}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    authMode === 'register' && styles.segmentButtonTextActive,
                  ]}
                >
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Email address</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>Password</Text>

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleAuthSubmit}>
              <Text style={styles.primaryButtonText}>
                {authMode === 'login' ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.authHint}>
              {authMode === 'login'
                ? 'Use any email and password to test the demo login.'
                : 'Register validates fields and password length before continuing.'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.dashboardHeaderRow}>
                <View style={styles.dashboardHeaderTextWrap}>
                  <Text style={styles.sectionEyebrow}>Dashboard</Text>
                  <Text style={styles.cardTitle}>Welcome back</Text>
                  <Text style={styles.infoText}>{user.email}</Text>
                </View>

                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarCircleText}>{userInitial}</Text>
                </View>
              </View>

              <View style={styles.summaryPanel}>
                <View style={styles.summaryTile}>
                  <Text style={styles.summaryTileLabel}>Total schedules</Text>
                  <Text style={styles.summaryTileValue}>{scheduleCount}</Text>
                </View>

                <View style={styles.summaryTile}>
                  <Text style={styles.summaryTileLabel}>Next up</Text>
                  <Text style={styles.summaryTileValueSmall}>
                    {nextSchedule ? `${nextSchedule.subject} • ${nextSchedule.time}` : 'No classes yet'}
                  </Text>
                </View>
              </View>

              <View style={styles.navRow}>
                <TouchableOpacity style={styles.navButton} onPress={() => setCurrentScreen('home')}>
                  <Text style={styles.navButtonText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navButton} onPress={goToAddScreen}>
                  <Text style={styles.navButtonText}>Add Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={logoutUser}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>

            {currentScreen === 'home' && (
              <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionEyebrow}>Overview</Text>
                    <Text style={styles.cardTitle}>Your schedules</Text>
                  </View>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillBadgeText}>{scheduleCount} item{scheduleCount === 1 ? '' : 's'}</Text>
                  </View>
                </View>

                {schedules.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateEmoji}>📚</Text>
                    <Text style={styles.emptyText}>No schedules yet. Tap “Add Schedule” to create your first class block.</Text>
                  </View>
                ) : (
                  schedules.map(item => (
                    <View key={item.id} style={styles.scheduleItem}>
                      <View style={styles.scheduleTopRow}>
                        <View style={styles.scheduleIcon}>
                          <Text style={styles.scheduleIconText}>
                            {(item.subject || 'SC').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.scheduleHeadingWrap}>
                          <Text style={styles.scheduleTitle}>{item.subject}</Text>
                          <Text style={styles.scheduleMeta}>Room {item.room}</Text>
                        </View>
                      </View>

                      <View style={styles.metaChipsRow}>
                        <View style={styles.metaChip}>
                          <Text style={styles.metaChipText}>{item.day}</Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Text style={styles.metaChipText}>{item.time}</Text>
                        </View>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.smallButton} onPress={() => goToEditScreen(item)}>
                          <Text style={styles.smallButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.smallDeleteButton}
                          onPress={() => handleDeleteSchedule(item.id)}
                        >
                          <Text style={styles.smallDeleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {currentScreen === 'add' && (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>Create</Text>
                  <Text style={styles.cardTitle}>Add a new schedule</Text>
                  <Text style={styles.sectionText}>Fill in the subject, room, day, and time for your new class.</Text>
                </View>

                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput style={styles.input} placeholder="Subject" value={subject} onChangeText={setSubject} />
                <Text style={styles.inputLabel}>Room</Text>
                <TextInput style={styles.input} placeholder="Room" value={room} onChangeText={setRoom} />
                <Text style={styles.inputLabel}>Day</Text>
                <TextInput style={styles.input} placeholder="Day" value={day} onChangeText={setDay} />
                <Text style={styles.inputLabel}>Time</Text>
                <TextInput style={styles.input} placeholder="Time" value={time} onChangeText={setTime} />

                <TouchableOpacity style={styles.primaryButton} onPress={handleAddSchedule}>
                  <Text style={styles.primaryButtonText}>Save Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentScreen('home')}>
                  <Text style={styles.secondaryButtonText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentScreen === 'edit' && editingId && (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>Update</Text>
                  <Text style={styles.cardTitle}>Edit schedule</Text>
                  <Text style={styles.sectionText}>Make changes and save them back to your schedule list.</Text>
                </View>

                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Subject"
                  value={editData.subject}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, subject: text }))}
                />
                <Text style={styles.inputLabel}>Room</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Room"
                  value={editData.room}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, room: text }))}
                />
                <Text style={styles.inputLabel}>Day</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Day"
                  value={editData.day}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, day: text }))}
                />
                <Text style={styles.inputLabel}>Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Time"
                  value={editData.time}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, time: text }))}
                />

                <TouchableOpacity style={styles.primaryButton} onPress={handleSaveSchedule}>
                  <Text style={styles.primaryButtonText}>Update Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={cancelEdit}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0B0F19',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  heroBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroDate: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#94A3B8',
    marginBottom: 24,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroStatNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroStatLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  inputLabel: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#6366F1',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '600',
  },
  authHint: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  dashboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  avatarCircleText: {
    color: '#4F46E5',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryPanel: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryTileValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryTileValueSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  navButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  navButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  logoutButtonText: {
    color: '#F43F5E',
    fontWeight: '600',
    fontSize: 14,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
  },
  pillBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  pillBadgeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyStateEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  scheduleItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scheduleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleHeadingWrap: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  scheduleMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metaChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  metaChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  smallButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  smallButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  smallDeleteButton: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallDeleteButtonText: {
    color: '#F43F5E',
    fontWeight: '600',
    fontSize: 13,
  },
  messageBox: {
    backgroundColor: '#ECFEFF',
    borderColor: '#C5F6FA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  messageText: {
    color: '#0E7490',
    fontSize: 14,
    fontWeight: '600',
  },
});
