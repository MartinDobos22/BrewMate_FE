import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  questionCategory: {
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#888',
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  questionSubtitle: {
    marginTop: 4,
    color: '#666',
  },
  optionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#6F4E37',
    backgroundColor: '#F5F0EB',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#6F4E37',
  },
  optionDescription: {
    marginTop: 8,
    color: '#555',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#6F4E37',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 32,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  skipText: {
    marginTop: 12,
    color: '#6F4E37',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#D7263D',
    marginTop: 12,
  },
  sliderContainer: {
    marginTop: 24,
  },
  sliderTrack: {
    height: 12,
    backgroundColor: '#EEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#6F4E37',
  },
  sliderValueText: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  textArea: {
    marginTop: 24,
    borderRadius: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
  },
  placeholderText: {
    color: '#888',
  },
  helperText: {
    color: '#6F4E37',
    fontWeight: '600',
    fontSize: 13,
  },
  inlineActions: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EFE8E2',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEE',
    marginTop: 24,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#6F4E37',
  },
  resultContainer: {
    padding: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  resultSubtitle: {
    marginTop: 8,
    color: '#555',
  },
  learningPathContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  learningModuleCard: {
    padding: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F7F2EC',
  },
  learningModuleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  learningModuleDescription: {
    marginTop: 8,
    color: '#555',
  },
  learningActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  learningActionPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#6F4E3715',
  },
  learningActionText: {
    fontWeight: '600',
    color: '#6F4E37',
  },
});
