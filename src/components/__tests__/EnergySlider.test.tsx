import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EnergySlider } from '../EnergySlider';

describe('EnergySlider', () => {
  const LEVEL_LABELS = ['Exhausted', 'Weary', 'Steady', 'Rested', 'Energised'];

  it('renders the slider', () => {
    const { getByLabelText } = render(
      <EnergySlider value={null} onChange={jest.fn()} />
    );
    expect(getByLabelText('Energy level')).toBeTruthy();
  });

  it('renders all 5 level labels', () => {
    const { getByText } = render(
      <EnergySlider value={null} onChange={jest.fn()} />
    );
    for (const label of LEVEL_LABELS) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('changing value calls onChange', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <EnergySlider value={null} onChange={onChange} />
    );
    fireEvent(getByLabelText('Energy level'), 'onValueChange', 1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('onChange is called with correct values', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <EnergySlider value={null} onChange={onChange} />
    );
    const slider = getByLabelText('Energy level');
    fireEvent(slider, 'onValueChange', 5);
    expect(onChange).toHaveBeenCalledWith(5);
    fireEvent(slider, 'onValueChange', 3);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('passes testID to the root element', () => {
    const { getByTestId } = render(
      <EnergySlider value={null} onChange={jest.fn()} testID="energy-slider" />
    );
    expect(getByTestId('energy-slider')).toBeTruthy();
  });

  it('selected label is visually indicated when value is set', () => {
    const { getByText } = render(
      <EnergySlider value={3} onChange={jest.fn()} />
    );
    expect(getByText('Steady')).toBeTruthy();
  });

  it('tapping a level label selects that level', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EnergySlider value={null} onChange={onChange} />
    );
    fireEvent.press(getByText('Rested'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('each level label is an accessible button carrying its selected state', () => {
    const { getByLabelText } = render(
      <EnergySlider value={3} onChange={jest.fn()} />
    );
    expect(getByLabelText('Steady').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true })
    );
    expect(getByLabelText('Weary').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false })
    );
  });

  it('announces current level name via accessibilityValue.text for screen readers', () => {
    const { getByLabelText } = render(
      <EnergySlider value={3} onChange={jest.fn()} />
    );
    const slider = getByLabelText('Energy level');
    expect(slider.props.accessibilityValue).toEqual(
      expect.objectContaining({ text: 'Steady' })
    );
  });
});
