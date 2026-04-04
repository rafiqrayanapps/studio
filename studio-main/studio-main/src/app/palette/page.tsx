import { VisualVibesPage } from '@/components/app/visual-vibes-page';
import { isValidHex } from '@/lib/utils';

export default function PalettePage({
  searchParams,
}: {
  searchParams: { colors?: string };
}) {
  let initialPalette: string[] | undefined = undefined;

  if (searchParams?.colors) {
    const colors = searchParams.colors.split(',');
    if (colors.every(isValidHex)) {
      initialPalette = colors.map(c => `#${c}`);
    }
  }

  return <VisualVibesPage initialPalette={initialPalette} />;
}
