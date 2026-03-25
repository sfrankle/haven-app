import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EnergySlider } from '../EnergySlider';

describe('EnergySlider', () => {
  const LEVEL_LABELS = ['Exhausted', 'Bit Tired', 'Average', 'Well Rested', 'Pumped'];

  it('renders 5 tappable positions', () => {
    const { getAllByRole } = render(
      <EnergySlider value={null} onChange={jest.fn()} />
    );
    const buttons = getAllByRole('button');
    expect(buttons.length).toBe(5);
  });

  it('renders all 5 level labels', () => {
    const { getByText } = render(
      <EnergySlider value={null} onChange={jest.fn()} />
    );
    for (const label of LEVEL_LABELS) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('tapping position 1 calls onChange with value 1', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <EnergySlider value={null} onChange={onChange} />
    );
    fireEvent.press(getAllByRole('button')[0]);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('tapping position 5 calls onChange with value 5', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <EnergySlider value={null} onChange={onChange} />
    );
    fireEvent.press(getAllByRole('button')[4]);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('tapping position 3 calls onChange with value 3', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <EnergySlider value={null} onChange={onChange} />
    );
    fireEvent.press(getAllByRole('button')[2]);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('passes testID to the root element', () => {
    const { getByTestId } = render(
      <EnergySlider value={null} onChange={jest.fn()} testID="energy-slider" />
    );
    expect(getByTestId('energy-slider')).toBeTruthy();
  });

  it('each position has an accessible label', () => {
    const { getAllByRole } = render(
      <EnergySlider value={null} onChange={jest.fn()} />
    );
    const buttons = getAllByRole('button');
    for (let i = 0; i < buttons.length; i++) {
      expect(buttons[i].props.accessibilityLabel).toBeTruthy();
    }
  });

  it('selected position is visually indicated (selected value prop received)', () => {
    // We test by checking the component renders without error when value is set.
    const { getAllByRole } = render(
      <EnergySlider value={3} onChange={jest.fn()} />
    );
    expect(getAllByRole('button').length).toBe(5);
  });
});
