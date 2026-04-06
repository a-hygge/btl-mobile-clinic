import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { GlassCard } from '../../components/ui/GlassCard';
import { systemColors, spacing, theme } from '../../constants/theme';
import {
  ocrPrescription,
  savePrescription,
  type OcrMedicine,
  type OcrResult,
} from '../../services/prescription.service';

function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export function OcrScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [medicines, setMedicines] = useState<OcrMedicine[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan prescriptions.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Photo library permission is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setOcrResult(null);
      setMedicines([]);
      setSaved(false);
    }
  }, []);

  const handleScan = useCallback(async () => {
    if (!imageUri) return;

    setScanning(true);
    try {
      const result = await ocrPrescription(imageUri);
      setOcrResult(result);
      setMedicines(result.medicines);
    } catch (error) {
      console.error('OCR failed:', error);
      Alert.alert('Scan Failed', 'Could not process the prescription image. Please try again.');
    } finally {
      setScanning(false);
    }
  }, [imageUri]);

  const updateMedicine = useCallback(
    (index: number, field: keyof OcrMedicine, value: string) => {
      setMedicines((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!ocrResult) return;

    setSaving(true);
    try {
      await savePrescription(ocrResult.imageUrl, {
        medicines,
        rawText: ocrResult.rawText,
      });
      setSaved(true);
      Alert.alert('Saved', 'Prescription has been saved successfully.');
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert('Save Failed', 'Could not save the prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [ocrResult, medicines]);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setOcrResult(null);
    setMedicines([]);
    setSaved(false);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#5AC8FA', '#007AFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="camera-document" size={32} color="#fff" />
            <Text variant="headlineMedium" style={styles.headerTitle}>
              Scan Prescription
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Take a photo or upload to extract medicine details
            </Text>
          </View>
        </LinearGradient>

        {/* Image Picker Section */}
        {!imageUri && (
          <FadeInView delay={100}>
            <GlassCard style={styles.pickerCard}>
              <View style={styles.pickerContent}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={64}
                  color={systemColors.gray3}
                />
                <Text variant="bodyLarge" style={styles.pickerText}>
                  Select a prescription image
                </Text>
                <View style={styles.pickerButtons}>
                  <Button
                    mode="contained"
                    icon="camera"
                    onPress={() => pickImage('camera')}
                    style={styles.pickerBtn}
                    buttonColor={systemColors.teal}
                  >
                    Camera
                  </Button>
                  <Button
                    mode="contained"
                    icon="image"
                    onPress={() => pickImage('gallery')}
                    style={styles.pickerBtn}
                    buttonColor={systemColors.blue}
                  >
                    Gallery
                  </Button>
                </View>
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* Image Preview */}
        {imageUri && !ocrResult && !scanning && (
          <FadeInView delay={100}>
            <GlassCard style={styles.previewCard}>
              <View>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                <View style={styles.previewActions}>
                  <Button
                    mode="outlined"
                    icon="close"
                    onPress={handleReset}
                    style={styles.actionBtn}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    icon="text-recognition"
                    onPress={handleScan}
                    style={styles.actionBtn}
                    buttonColor={systemColors.teal}
                  >
                    Scan
                  </Button>
                </View>
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* Scanning State */}
        {scanning && (
          <FadeInView delay={0}>
            <GlassCard style={styles.scanningCard}>
              <View style={styles.scanningContent}>
                <LottieView
                  source={require('../../assets/animations/empty-state.json')}
                  autoPlay
                  loop
                  style={styles.scanningAnimation}
                />
                <Text variant="titleMedium" style={styles.scanningText}>
                  Analyzing prescription...
                </Text>
                <Text variant="bodySmall" style={styles.scanningSubtext}>
                  AI is extracting medicine details
                </Text>
                <ActivityIndicator
                  size="small"
                  color={systemColors.teal}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            </GlassCard>
          </FadeInView>
        )}

        {/* OCR Results */}
        {ocrResult && medicines.length > 0 && (
          <>
            <FadeInView delay={100}>
              <View style={styles.resultsHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Extracted Medicines ({medicines.length})
                </Text>
                <IconButton
                  icon="refresh"
                  size={20}
                  onPress={handleReset}
                  iconColor={systemColors.blue}
                />
              </View>
            </FadeInView>

            {medicines.map((medicine, index) => (
              <FadeInView key={index} delay={150 + index * 80}>
                <GlassCard style={styles.medicineCard}>
                  <View>
                    <View style={styles.medicineHeader}>
                      <View style={styles.medicineIconContainer}>
                        <MaterialCommunityIcons
                          name="pill"
                          size={24}
                          color={systemColors.teal}
                        />
                      </View>
                      <Text variant="titleSmall" style={styles.medicineNumber}>
                        Medicine #{index + 1}
                      </Text>
                    </View>

                    <TextInput
                      label="Name"
                      value={medicine.name}
                      onChangeText={(v) => updateMedicine(index, 'name', v)}
                      mode="outlined"
                      style={styles.input}
                      outlineColor={systemColors.gray4}
                      activeOutlineColor={systemColors.teal}
                      dense
                    />
                    <View style={styles.inputRow}>
                      <TextInput
                        label="Dosage"
                        value={medicine.dosage}
                        onChangeText={(v) => updateMedicine(index, 'dosage', v)}
                        mode="outlined"
                        style={[styles.input, styles.inputHalf]}
                        outlineColor={systemColors.gray4}
                        activeOutlineColor={systemColors.teal}
                        dense
                      />
                      <TextInput
                        label="Quantity"
                        value={medicine.quantity}
                        onChangeText={(v) => updateMedicine(index, 'quantity', v)}
                        mode="outlined"
                        style={[styles.input, styles.inputHalf]}
                        outlineColor={systemColors.gray4}
                        activeOutlineColor={systemColors.teal}
                        dense
                      />
                    </View>
                    <TextInput
                      label="Frequency"
                      value={medicine.frequency}
                      onChangeText={(v) => updateMedicine(index, 'frequency', v)}
                      mode="outlined"
                      style={styles.input}
                      outlineColor={systemColors.gray4}
                      activeOutlineColor={systemColors.teal}
                      dense
                    />
                  </View>
                </GlassCard>
              </FadeInView>
            ))}

            {/* Save Button */}
            <FadeInView delay={150 + medicines.length * 80}>
              <Button
                mode="contained"
                icon={saved ? 'check' : 'content-save'}
                onPress={handleSave}
                loading={saving}
                disabled={saving || saved}
                style={styles.saveBtn}
                buttonColor={saved ? systemColors.green : systemColors.blue}
              >
                {saved ? 'Saved' : 'Save Prescription'}
              </Button>
            </FadeInView>
          </>
        )}

        {/* No medicines found */}
        {ocrResult && medicines.length === 0 && (
          <FadeInView delay={100}>
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyContent}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color={systemColors.orange}
                />
                <Text variant="titleSmall" style={styles.emptyTitle}>
                  No Medicines Detected
                </Text>
                <Text variant="bodySmall" style={styles.emptyText}>
                  The AI could not extract medicine details. Try a clearer photo.
                </Text>
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={handleReset}
                  style={{ marginTop: spacing.md }}
                >
                  Try Again
                </Button>
              </View>
            </GlassCard>
          </FadeInView>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  // Picker
  pickerCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  pickerContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  pickerText: {
    color: theme.colors.onSurfaceVariant,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  pickerBtn: {
    borderRadius: 12,
  },
  // Preview
  previewCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: systemColors.gray6,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
  },
  // Scanning
  scanningCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  scanningContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  scanningAnimation: {
    width: 120,
    height: 120,
  },
  scanningText: {
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: spacing.sm,
  },
  scanningSubtext: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  // Results
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  medicineCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  medicineIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(90, 200, 250, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineNumber: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputHalf: {
    flex: 1,
  },
  saveBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderRadius: 12,
    paddingVertical: 4,
  },
  // Empty
  emptyCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
