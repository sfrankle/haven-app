import { TAB_BAR_SCREEN_OPTIONS } from '../TabBar';
import { colors } from '@/constants/theme';

describe('TAB_BAR_SCREEN_OPTIONS', () => {
  it('uses interactive token for active tint', () => {
    expect(TAB_BAR_SCREEN_OPTIONS.tabBarActiveTintColor).toBe(colors.interactive);
  });

  it('uses chrome token for inactive tint', () => {
    expect(TAB_BAR_SCREEN_OPTIONS.tabBarInactiveTintColor).toBe(colors.chrome);
  });

  it('uses surface token for tab bar background', () => {
    expect((TAB_BAR_SCREEN_OPTIONS.tabBarStyle as Record<string, unknown>).backgroundColor).toBe(colors.surface);
  });

  it('hides the header', () => {
    expect(TAB_BAR_SCREEN_OPTIONS.headerShown).toBe(false);
  });
});
