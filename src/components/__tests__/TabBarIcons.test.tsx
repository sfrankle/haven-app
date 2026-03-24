import { TAB_ICON_MAP } from '../TabBar';

describe('TAB_ICON_MAP', () => {
  it('assigns spa-outline to the (tend) tab', () => {
    expect(TAB_ICON_MAP['(tend)']).toBe('spa-outline');
  });

  it('assigns notebook-heart-outline to the trace tab', () => {
    expect(TAB_ICON_MAP['trace']).toBe('notebook-heart-outline');
  });

  it('assigns chart-timeline-variant-shimmer to the weave tab', () => {
    expect(TAB_ICON_MAP['weave']).toBe('chart-timeline-variant-shimmer');
  });

  it('assigns anchor to the anchor tab', () => {
    expect(TAB_ICON_MAP['anchor']).toBe('anchor');
  });

  it('assigns tune to the settings tab', () => {
    expect(TAB_ICON_MAP['settings']).toBe('tune');
  });
});
