import { ReactTestInstance } from 'react-test-renderer';

/**
 * Flattens a React Native style array from a rendered element into a single object.
 * Use with getByTestId(...) to assert on computed styles.
 */
export function getStyle(element: ReactTestInstance): Record<string, unknown> {
  const style = element.props.style;
  return Array.isArray(style) ? Object.assign({}, ...style) : style ?? {};
}
