'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ContentItem } from '@/lib/definitions';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download, Copy, Trash2, Heart, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import BottomNav from '@/components/layout/BottomNav';
import { WithId } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Helper to gracefully handle old localized data
const getArabicString = (field: string | { ar: string, en: string } | undefined | null): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.ar || '';
};

// Reusable Remove Button
const RemoveButton = ({ onRemove }: { onRemove: () => void }) => (
  <Button
    size="icon"
    className="absolute top-2 left-2 z-10 h-9 w-9 bg-black/50 hover:bg-black/70 text-white"
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
);

// A component for Prompt-based items (Style 3)
const PromptItemCard = ({ item, onRemove, onImageClick }: { item: WithId<ContentItem>, onRemove: (id: string) => void, onImageClick: (url: string) => void }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    if (item.prompt) {
      navigator.clipboard.writeText(item.prompt);
      toast({ title: "تم نسخ البرومبت!" });
    }
  };

  return (
    <Card className="overflow-hidden bg-card text-card-foreground flex flex-col h-full group">
      {item.imageUrl && (
        <div className="relative w-full cursor-pointer aspect-video bg-muted" onClick={() => onImageClick(item.imageUrl!)}>
          <RemoveButton onRemove={() => onRemove(item.id)} />
          <Image src={item.imageUrl} alt={getArabicString(item.title)} fill className="object-cover" />
        </div>
      )}
      <CardContent className="p-4 flex flex-col flex-1 gap-4 text-right">
        <h3 className="font-bold text-xl text-center">{getArabicString(item.title)}</h3>
        {item.instructions && (
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">التعليمات</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted rounded-md">{getArabicString(item.instructions)}</p>
          </div>
        )}
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">البرومبت</h4>
          <Textarea readOnly value={item.prompt} className="h-28 bg-muted border-transparent" dir="ltr" />
        </div>
        <Button variant="default" className="w-full mt-auto" onClick={handleCopy}>
          <Copy className="ml-2 h-4 w-4" />
          نسخ البرومبت
        </Button>
      </CardContent>
    </Card>
  );
};

// A component for Video-based items (Style 4)
const VideoItemCard = ({ item, onRemove }: { item: WithId<ContentItem>, onRemove: (id: string) => void }) => {
    return (
        <div className="overflow-hidden flex flex-col h-full group relative bg-primary text-primary-foreground p-4 rounded-2xl">
            <div className="pb-2">
                <h3 className="font-bold text-lg text-center">{getArabicString(item.title)}</h3>
            </div>
            
            <a href={item.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="relative block">
                <div className="aspect-video relative w-full cursor-pointer rounded-lg overflow-hidden shadow-lg" >
                    <RemoveButton onRemove={() => onRemove(item.id)} />
                    {item.imageUrl && <Image src={item.imageUrl} alt={getArabicString(item.title)} fill className="object-cover" />}
                </div>
            </a>
            
            <div className="pt-4 mt-auto">
                <a href={item.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="secondary" className="w-full">
                        <PlayCircle className="ml-2 h-4 w-4" />
                        مشاهدة الفيديو
                    </Button>
                </a>
            </div>
        </div>
    );
};

// A component for Downloadable items (Style 1/2)
const DownloadItemCard = ({ item, onRemove, onImageClick }: { item: WithId<ContentItem>, onRemove: (id: string) => void, onImageClick: (url: string) => void }) => {
    return (
        <div className="flex flex-col text-center group gap-y-3">
            <h3 className="font-bold text-base text-card-foreground min-h-[2.5rem] flex items-center justify-center">{getArabicString(item.title)}</h3>
            {item.imageUrl && (
              <div className="relative w-full cursor-pointer aspect-square bg-muted rounded-lg shadow-md overflow-hidden" onClick={() => onImageClick(item.imageUrl!)}>
                <RemoveButton onRemove={() => onRemove(item.id)} />
                <Image src={item.imageUrl} alt={getArabicString(item.title)} fill className="object-cover" />
              </div>
            )}
            <div className="w-full mt-auto">
              <a href={item.downloadUrl || '#'} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">
                  <Download className="ml-2 h-4 w-4" />
                  تحميل
                </Button>
              </a>
            </div>
        </div>
    );
};


export default function FavoritesPage() {
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const removeFromFavorites = (itemId: string) => {
    setFavorites(prevFavorites => prevFavorites.filter(item => item.id !== itemId));
    toast({ title: "تمت الإزالة من المفضلة" });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="المفضلة" />
      <main className="flex-1 px-6 pt-4 pb-24">
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {favorites.map((item) => {
              if (item.prompt) {
                return <PromptItemCard key={item.id} item={item} onRemove={removeFromFavorites} onImageClick={setSelectedImage} />;
              }
              if (item.videoUrl) {
                return <VideoItemCard key={item.id} item={item} onRemove={removeFromFavorites} />;
              }
              return <DownloadItemCard key={item.id} item={item} onRemove={removeFromFavorites} onImageClick={setSelectedImage} />;
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-12 mt-10 bg-card rounded-2xl">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-bold text-lg">قائمة المفضلة فارغة</h3>
            <p className="mt-1">أضف بعض المحتوى إلى مفضلتك لتجده هنا لاحقاً.</p>
          </div>
        )}
      </main>
      <BottomNav />
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <Image src={selectedImage} alt="Preview" width={1200} height={800} className="w-full h-auto max-h-[90vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
