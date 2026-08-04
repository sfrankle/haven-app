import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { logScreenStyles } from '../constants/sharedStyles';

/**
 * #195: a ScrollView's contentContainerStyle must use flexGrow, not flex.
 * `flex: 1` caps the content box at the viewport height, so a form taller than
 * the screen silently stops scrolling and its save button becomes unreachable.
 * That defect cost the suite one excluded Maestro flow and one coverage gap, so
 * it is guarded at the source level rather than left to review.
 */

const APP_DIR = join(__dirname, '..', '..', 'app');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('scroll content style', () => {
  it('grows past the viewport instead of being capped by it', () => {
    const style = logScreenStyles.scrollContent as { flex?: number; flexGrow?: number };
    expect(style.flexGrow).toBe(1);
    expect(style.flex).toBeUndefined();
  });

  it('keeps flex: 1 on screenContent for plain View screens', () => {
    const style = logScreenStyles.screenContent as { flex?: number };
    expect(style.flex).toBe(1);
  });

  it('is what every contentContainerStyle in app/ uses', () => {
    const offenders = tsxFiles(APP_DIR).filter((file) =>
      /contentContainerStyle=\{logScreenStyles\.screenContent\}/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
