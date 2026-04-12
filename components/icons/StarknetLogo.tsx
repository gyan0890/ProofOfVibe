export function StarknetLogo({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z"
        fill="white"
        opacity="0.8"
      />
    </svg>
  );
}
