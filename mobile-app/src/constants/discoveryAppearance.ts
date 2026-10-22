/** Shared surfaces for discovery and bottom navigation. */
export function discoveryAppearance(dark: boolean) {
  return {
    background: dark ? '#111016' : '#FAF8F5',
    surface: dark ? '#221B26' : '#F0E6EC',
    elevated: dark ? '#2A2230' : '#FFFFFF',
    text: dark ? '#FAF7FA' : '#241C24',
    muted: dark ? '#C1B7C5' : '#6B5E69',
    border: dark ? '#4A3D4C' : '#CEBDC9',
    accent: dark ? '#F28BB6' : '#A91D56',
    onAccent: dark ? '#21101A' : '#FFFFFF',
    error: dark ? '#FCA5A5' : '#A92236',
  };
}
