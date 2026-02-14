'use client';

import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import { useLocale } from '@/hooks/use-locale';

const palettes = [
  { name: 'أزرق سماوي', shades: ['#93C5FD', '#60A5FA', '#3B82F6'], tints: ['#EFF6FF', '#BFDBFE'] },
  { name: 'غروب الشمس', shades: ['#FEF3C7', '#FDBA74', '#FB923C', '#F97316', '#EA580C'], tints: [] },
  { name: 'أخضر طبيعي', shades: ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981'], tints: [] },
  { name: 'بنفسجي أنيق', shades: ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6'], tints: [] },
  { name: 'وردي دافئ', shades: ['#FCE7F3','#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899'], tints: [] },
  { name: 'أحمر ناري', shades: ['#F87171', '#EF4444', '#DC2626'], tints: ['#FEE2E2', '#FECACA'] },
  { name: 'تركوازي منعش', shades: ['#5EEAD4', '#2DD4BF', '#14B8A6'], tints: ['#CCFBF1', '#99F6E4'] },
  { name: 'نيلي عميق', shades: ['#A5B4FC', '#818CF8', '#6366F1'], tints: ['#E0E7FF', '#C7D2FE'] },
  { name: 'رمادي محايد', shades: ['#9CA3AF', '#6B7280', '#4B5563'], tints: ['#F3F4F6', '#E5E7EB'] },
  { name: 'سماوي مشرق', shades: ['#67E8F9', '#22D3EE', '#06B6D4'], tints: ['#CFFAFE', '#A5F3FC'] },
];

const CopyableColorChip = ({ hex }: { hex: string }) => {
    const { toast } = useToast();
    const { t } = useLocale();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(hex);
        toast({
            title: t('copied'),
            description: t('colorCopied', { hex }),
        });
    }
  return (
    <div onClick={copyToClipboard} className="flex items-center justify-between gap-2 cursor-pointer group p-2 bg-card rounded-lg border shadow-sm hover:bg-secondary transition-colors w-full">
      <span className="text-muted-foreground group-hover:text-primary text-sm font-mono">{hex}</span>
      <div style={{ backgroundColor: hex }} className="h-5 w-5 rounded-full border"></div>
    </div>
  );
};


export default function ColorsPage() {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const { t } = useLocale();

  const handleNextPalette = () => {
    setPaletteIndex((prevIndex) => (prevIndex + 1) % palettes.length);
  };

  const mainPalette = palettes[paletteIndex];
  const allMainColors = [...mainPalette.tints, ...mainPalette.shades];
  const otherPalettes = palettes.filter((_, index) => index !== paletteIndex);

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title={t('colorCoordinator')}/>
      <main className="flex-1 px-4 pb-24 -mt-8">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-card rounded-2xl p-4 space-y-6">
              <div className="flex justify-between items-center px-2">
                    <Button variant="ghost" size="sm" onClick={handleNextPalette}>
                      <RefreshCw className="ml-2 h-4 w-4"/>
                      {t('next')}
                  </Button>
                  <h3 className="text-xl font-bold">{mainPalette.name}</h3>
              </div>

              <Card>
                  <CardContent className="p-4 space-y-3">
                      <div className="flex space-x-0 rtl:space-x-reverse rounded-lg overflow-hidden h-32">
                          {allMainColors.map((color) => (
                              <div key={color} style={{backgroundColor: color}} className="flex-1" />
                          ))}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {allMainColors.map((color) => (<CopyableColorChip key={color} hex={color} />))}
                      </div>
                  </CardContent>
              </Card>

              <div className="space-y-4">
                  {otherPalettes.map((palette) => {
                    const allOtherColors = [...palette.tints, ...palette.shades];
                    return (
                      <Card key={palette.name}>
                          <CardContent className="p-3">
                              <div className="flex justify-between items-center gap-4">
                                  <div className="flex h-8 w-40 rounded-full overflow-hidden border">
                                      {allOtherColors.map(color => (
                                          <div key={color} style={{backgroundColor: color}} className="flex-1 h-full" />
                                      ))}
                                  </div>
                                  <p className="font-semibold">{palette.name}</p>
                              </div>
                          </CardContent>
                      </Card>
                    );
                  })}
              </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
