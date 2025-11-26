import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scales a horizontal size value relative to a 375px design baseline.
 *
 * @param size - The design-space measurement to transform.
 * @returns The measurement adjusted for the current device width.
 */
export const scale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scales a vertical size value relative to an 812px design baseline.
 *
 * @param size - The design-space measurement to transform.
 * @returns The measurement adjusted for the current device height.
 */
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
