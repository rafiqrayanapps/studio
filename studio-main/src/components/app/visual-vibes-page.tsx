"use client";

import { useState, useTransition, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  Wand2,
  Copy,
  Check,
  Save,
  Share2,
  Trash2,
  LoaderCircle,
  Paintbrush,
  X,
} from 'lucide-react';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { cn, copyToClipboard } from '@/lib/utils';
import { generatePaletteFromImage } from '@/ai/flows/generate-palette-from-image';
import { refineColorPalette } from '@/ai/flows/refine-color-palette';
import { Header } from '@/components/app/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';

type Palette = string[];

export function VisualVibesPage({ initialPalette }: { initialPalette?: Palette }) {
  const [palette, setPalette] = useState<Palette | null>(initialPalette || null);
  const [image, setImage] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isRefining, startRefining] = useTransition();
  const [savedPalettes, setSavedPalettes] = useLocalStorage<Palette[]>('visual-vibes-palettes', []);
  const { toast } = useToast();
  const refineInputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (initialPalette) {
      setPalette(initialPalette);
    }
  }, [initialPalette]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        setImage(dataUri);
        startGenerating(async () => {
          try {
            const result = await generatePaletteFromImage({ photoDataUri: dataUri });
            setPalette(result.palette);
          } catch (error) {
            console.error(error);
            toast({
              variant: 'destructive',
              title: 'Generation Failed',
              description: 'Could not generate a palette from the image.',
            });
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefine = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!palette || !refineInputRef.current?.value) return;

    const instructions = refineInputRef.current.value;

    startRefining(async () => {
      try {
        const newPalette = await refineColorPalette({
          originalPalette: palette,
          instructions,
        });
        if (newPalette.length > 0) {
          setPalette(newPalette);
        } else {
          throw new Error("AI returned an empty palette.");
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Refinement Failed',
          description: 'Could not refine the color palette.',
        });
      }
    });
  };

  const handleCopy = (color: string) => {
    copyToClipboard(color).then(() => {
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 2000);
    });
  };
  
  const handleSavePalette = () => {
    if (!palette) return;
    if (savedPalettes.some(p => JSON.stringify(p) === JSON.stringify(palette))) {
        toast({ title: "Palette already saved."});
        return;
    }
    setSavedPalettes([palette, ...savedPalettes]);
    toast({
        title: "Palette Saved!",
        description: "Your new color palette has been saved.",
    });
  };

  const handleSharePalette = () => {
    if (!palette) return;
    const colorString = palette.map(c => c.substring(1)).join(',');
    const url = `${window.location.origin}/palette?colors=${colorString}`;
    copyToClipboard(url).then(() => {
        toast({
            title: "Link Copied!",
            description: "A shareable link has been copied to your clipboard.",
        });
    });
  };
  
  const handleSelectSavedPalette = (p: Palette) => {
    setPalette(p);
    setImage(null);
  };
  
  const handleDeletePalette = (index: number) => {
    const newSavedPalettes = [...savedPalettes];
    newSavedPalettes.splice(index, 1);
    setSavedPalettes(newSavedPalettes);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header />
      <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6 md:grid md:grid-cols-[1fr_320px]">
        <main className="flex flex-1 flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Color Palette Generator</CardTitle>
              <CardDescription>Upload an image to extract its dominant colors.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-8">
              {!image && !palette && (
                <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center transition-colors hover:border-primary hover:bg-gray-100">
                  <UploadCloud className="mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  <input type="file" onChange={handleImageUpload} accept="image/*" className="absolute h-full w-full cursor-pointer opacity-0" />
                </div>
              )}

              {isGenerating && (
                <div className="flex h-64 w-full items-center justify-center">
                  <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                  <p className="ml-4 text-lg">Generating your palette...</p>
                </div>
              )}

              {palette && (
                <div className="flex flex-col gap-6">
                  <div className="flex h-48 w-full overflow-hidden rounded-lg shadow-inner">
                    {palette.map((color, i) => (
                      <div key={i} style={{ backgroundColor: color }} className="group relative flex-1 transition-all duration-300 hover:flex-grow-[1.5]">
                        <div className="absolute inset-x-0 bottom-0 flex translate-y-full flex-col items-center justify-end p-2 transition-transform duration-300 group-hover:translate-y-0">
                           <button onClick={() => handleCopy(color)} className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-sm">
                            {copiedColor === color ? <Check size={16} /> : <Copy size={16} />}
                            {color}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button onClick={handleSavePalette} variant="outline"><Save className="mr-2" /> Save</Button>
                    <Button onClick={handleSharePalette} variant="outline"><Share2 className="mr-2"/> Share</Button>
                  </div>

                  <Card>
                    <CardHeader>
                       <CardTitle className="font-headline flex items-center gap-2"><Wand2 className="text-accent"/>Refine Palette</CardTitle>
                       <CardDescription>Use AI to adjust your palette. Try "make it more pastel" or "add a warm orange".</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <form onSubmit={handleRefine} className="flex flex-col gap-4">
                        <Textarea ref={refineInputRef} placeholder="Enter refinement instructions..." className="resize-none"/>
                        <Button type="submit" disabled={isRefining} className="self-end bg-accent hover:bg-accent/90">
                            {isRefining ? <LoaderCircle className="animate-spin" /> : "Refine"}
                        </Button>
                       </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="hidden md:flex">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Paintbrush /> Saved Palettes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                {savedPalettes.length > 0 ? (
                    <div className="space-y-4">
                    {savedPalettes.map((p, i) => (
                        <div key={i} className="group cursor-pointer rounded-lg border p-3 hover:border-primary">
                          <div className="flex h-12 w-full overflow-hidden rounded-md" onClick={() => handleSelectSavedPalette(p)}>
                              {p.map((color, j) => (
                                  <div key={j} style={{ backgroundColor: color }} className="flex-1" />
                              ))}
                          </div>
                          <button onClick={() => handleDeletePalette(i)} className="absolute right-5 top-5 hidden group-hover:block">
                            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                        <p>Your saved palettes will appear here.</p>
                    </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
