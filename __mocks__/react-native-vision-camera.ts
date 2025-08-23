export const Camera = () => null;
export const useCameraDevice = () => ({
  id: 'mock',
  devices: [],
});
export const useCameraPermission = () => ({
  hasPermission: true,
  requestPermission: jest.fn(),
});
export type PhotoFile = { path: string };
