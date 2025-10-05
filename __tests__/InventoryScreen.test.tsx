import React from 'react';
import TestRenderer from 'react-test-renderer';
import InventoryScreen from '../src/screens/InventoryScreen';

const mockReminders = [
  {
    id: '123',
    message: 'Test reminder',
  },
];

const cancelLocalNotificationMock = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-native-add-calendar-event', () => ({
  presentEventCreatingDialog: jest.fn(),
}));

jest.mock('react-native-push-notification', () => ({
  __esModule: true,
  default: {
    getScheduledLocalNotifications: jest.fn((callback: (reminders: any[]) => void) => {
      callback(mockReminders);
    }),
  },
}));

jest.mock('../src/utils/reminders', () => ({
  scheduleReminder: jest.fn(),
  cancelLocalNotification: cancelLocalNotificationMock,
}));

describe('InventoryScreen', () => {
  beforeEach(() => {
    cancelLocalNotificationMock.mockClear();
  });

  it('routes reminder cancellation through the service helper', async () => {
    type Renderer = ReturnType<typeof TestRenderer.create>;
    let renderer: Renderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(<InventoryScreen />);
      await Promise.resolve();
    });

    const cancelButton = renderer!.root.findByProps({title: 'Zrušiť'});

    await TestRenderer.act(async () => {
      cancelButton.props.onPress();
    });

    expect(cancelLocalNotificationMock).toHaveBeenCalledWith('123');
  });
});
