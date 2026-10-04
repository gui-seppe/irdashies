import type { ReactNode } from 'react';

export interface FlagContourProps {
  children: ReactNode;
  compactMode?: boolean;
  flags?: { enabled: boolean };
  flagColor?: string;
  backgroundOpacity?: number;
  borderWidth?: number;
  /** Shrink to the content and keep the right edge in place. */
  fitWidth?: boolean;
}

export const FlagContour = ({
  children,
  compactMode = false,
  flags = { enabled: false },
  flagColor,
  backgroundOpacity = 0,
  borderWidth = 5,
  fitWidth = false,
}: FlagContourProps) => {
  const containerClassName = `${fitWidth ? 'relative ml-auto w-fit max-w-full' : 'w-full'} bg-slate-800/(--bg-opacity) rounded-sm ${
    !compactMode ? 'p-2' : ''
  } overflow-hidden ${flags.enabled ? 'border-solid' : ''}`;

  const containerStyle = {
    ['--bg-opacity' as string]: `${backgroundOpacity}%`,
    ...(flags.enabled &&
      flagColor && { borderColor: flagColor, borderWidth: `${borderWidth}px` }),
  };

  return (
    <div className={containerClassName} style={containerStyle}>
      {children}
    </div>
  );
};
FlagContour.displayName = 'FlagContour';
