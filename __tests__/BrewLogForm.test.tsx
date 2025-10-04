import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Button, TextInput } from 'react-native';

import BrewLogForm from '../src/components/BrewLogForm';
import { saveBrewLog } from '../src/services/brewLogService';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('../src/services/brewLogService', () => ({
  saveBrewLog: jest.fn(() => Promise.resolve()),
}));

describe('BrewLogForm', () => {
  beforeEach(() => {
    (saveBrewLog as jest.Mock).mockClear();
  });

  it('saves a valid brew log and notifies listeners', async () => {
    const handleSaved = jest.fn();
    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<BrewLogForm onSaved={handleSaved} />);
    });

    const inputs = component.root.findAllByType(TextInput);

    act(() => {
      inputs[0].props.onChangeText('92');
      inputs[1].props.onChangeText('18');
      inputs[2].props.onChangeText('15');
      inputs[3].props.onChangeText('02:30');
      inputs[4].props.onChangeText('Skvelá chuť');
    });

    const saveButton = component.root.findByType(Button);

    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(saveBrewLog).toHaveBeenCalledTimes(1);
    const [savedLog, options] = (saveBrewLog as jest.Mock).mock.calls[0];
    expect(savedLog).toMatchObject({
      waterTemp: 92,
      coffeeDose: 18,
      waterVolume: 270,
      brewTime: '02:30',
      notes: 'Skvelá chuť',
    });
    expect(options).toEqual({ showFeedback: false });
    expect(handleSaved).toHaveBeenCalledWith(savedLog);

    const updatedInputs = component.root.findAllByType(TextInput);
    expect(updatedInputs[0].props.value).toBe('');
    expect(updatedInputs[1].props.value).toBe('');
    expect(updatedInputs[2].props.value).toBe('');
  });

  it('calls onError when saving fails', async () => {
    const error = new Error('failed');
    (saveBrewLog as jest.Mock).mockRejectedValueOnce(error);
    const handleError = jest.fn();
    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<BrewLogForm onError={handleError} />);
    });

    const inputs = component.root.findAllByType(TextInput);

    act(() => {
      inputs[0].props.onChangeText('92');
      inputs[1].props.onChangeText('18');
      inputs[2].props.onChangeText('15');
    });

    const saveButton = component.root.findByType(Button);

    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(handleError).toHaveBeenCalledWith(error);
  });
});
