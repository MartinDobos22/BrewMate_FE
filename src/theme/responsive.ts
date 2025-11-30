import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scales a size horizontally based on the device width relative to a 375pt guideline.
 *
 * @param {number} size - Base size value defined for the guideline device width.
 * @returns {number} Adjusted size proportional to the current screen width.
 */
export const scale = (size: number) => (width / guidelineBaseWidth) * size;

/**
 * Scales a size vertically based on the device height relative to an 812pt guideline.
 *
 * @param {number} size - Base size value defined for the guideline device height.
 * @returns {number} Adjusted size proportional to the current screen height.
 */
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
