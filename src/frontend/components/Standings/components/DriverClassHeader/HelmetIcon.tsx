interface HelmetIconProps {
  size?: number | string;
  className?: string;
}

/**
 * Racing helmet glyph (side view, facing right) with the visor cut out.
 * Phosphor has no racing helmet, so this mirrors its sizing: 1em by default
 * and filled with currentColor.
 */
export const HelmetIcon = ({ size = '1em', className }: HelmetIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M20 148C20 82 76 30 144 30c60 0 96 40 96 92v58c0 24-20 44-44 44H64c-24 0-44-20-44-44v-32ZM108 98c0-8 6-14 14-14h96c8 0 12 6 12 14v46c0 8-4 14-12 14h-80c-17 0-30-13-30-30V98Z"
    />
  </svg>
);
