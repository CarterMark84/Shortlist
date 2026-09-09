import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Line icons drawn inline.
 *
 * @expo/vector-icons is not part of this install, and pulling a whole icon
 * font in for three glyphs is not worth the bundle.
 */
interface IconProps {
  /** `ColorValue` rather than `string`: navigation passes platform colours. */
  color: ColorValue;
  size?: number;
}

function Line({ d, color, size = 24 }: IconProps & { d: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return <Line {...props} d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-3.5-3.5" />;
}

export function HistoryIcon(props: IconProps) {
  return <Line {...props} d="M12 3a9 9 0 109 9 9 9 0 00-9-9zM12 7v5l4 2" />;
}

export function BookmarkIcon(props: IconProps) {
  return <Line {...props} d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />;
}

export function TrashIcon(props: IconProps) {
  return (
    <Line
      {...props}
      d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6"
    />
  );
}

export function ChevronRightIcon(props: IconProps) {
  return <Line {...props} d="M9 6l6 6-6 6" />;
}

export function ArrowRightIcon(props: IconProps) {
  return <Line {...props} d="M5 12h14M13 6l6 6-6 6" />;
}
