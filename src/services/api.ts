import { Platform } from 'react-native';

// Resolve backend URL for different platforms
const API_HOST = Platform.OS === 'ios' ? 'http://localhost:3001' : 'http://10.0.2.2:3001';
export const API_URL = `${API_HOST}/api`;
export { API_HOST };
