'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ContentItem } from '@/lib/definitions';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download, Copy, Trash2, Heart, PlayCircle, Lock, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { WithId } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
const PromptItemCard = ({ item, onRemove, onImageClick, isLocked }: { item: WithId<ContentItem>, onRemove: (id: string) => void, onImageClick: (url: string) => void, isLocked: boolean }) => {
  const { toast } = useToast();
  const router = useRouter();

  const handleCopy = () => {
    if (item.prompt) {
      navigator.clipboard.writeText(item.prompt);
      toast({ title: "تم نسخ البرومبت!" });
    }
  };

  return (
    <Card className="overflow-hidden bg-card text-card-foreground flex flex-col h-full group rounded-[2.5rem] border-none shadow-lg">
      {item.imageUrl && (
        <div className="relative w-full cursor-pointer aspect-video bg-muted" onClick={() => !isLocked && onImageClick(item.imageUrl!)}>
          <RemoveButton onRemove={() => onRemove(item.id)} />
          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
        </div>
      )}
      <CardContent className="p-6 flex flex-col flex-1 gap-4 text-right">
        <h3 className="font-bold text-xl text-center text-primary">{item.title}</h3>
        <div className="space-y-2">
          <h4 className="text-[10px] font-black opacity-40 uppercase tracking-widest">البرومبت</h4>
           {isLocked ? (
              <div className="h-28 bg-muted rounded-2xl flex flex-col items-center justify-center text-center p-4 gap-2">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                  <p className="text-muted-foreground font-semibold">محتوى حصري للمشتركين</p>
                  <Button size="sm" variant="secondary" onClick={() => router.push('/pricing')}>الترقية الآن</Button>
              </div>
          ) : (
            <Textarea readOnly value={item.prompt} className="h-28 bg-muted/50 border-transparent rounded-2xl font-mono text-xs" dir="ltr" />
          )}
        </div>
        <div className="flex gap-2 mt-auto">
            <Button variant="default" className="flex-1 h-12 rounded-xl font-bold" onClick={handleCopy} disabled={isLocked}>
                {isLocked ? <Lock className="ml-2 h-4 w-4" /> : <Copy className="ml-2 h-4 w-4" />}
                {isLocked ? 'الترقية للنسخ' : 'نسخ البرومبت'}
            </Button>
            {!isLocked && item.downloadUrl && (
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => window.open(item.downloadUrl, '_blank')}>
                    <Download className="h-5 w-5" />
                </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

// A component for Video-based items (Style 4)
const VideoItemCard = ({ item, onRemove, isLocked }: { item: WithId<ContentItem>, onRemove: (id: string) => void, isLocked: boolean }) => {
    const router = useRouter();

    const handleLockedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push('/pricing');
    };

    return (
        <div className="overflow-hidden flex flex-col h-full group relative bg-primary text-primary-foreground p-4 rounded-3xl shadow-xl">
            {isLocked && <Crown className="absolute top-2 right-2 h-5 w-5 text-yellow-300 z-10" />}
            <div className="pb-2">
                <h3 className="font-bold text-lg text-center truncate px-2">{item.title}</h3>
            </div>
            
            <a href={isLocked ? '#' : item.videoUrl || '#'} onClick={isLocked ? handleLockedClick : undefined} target="_blank" rel="noopener noreferrer" className="relative block">
                <div className="aspect-video relative w-full cursor-pointer rounded-2xl overflow-hidden shadow-lg" >
                    <RemoveButton onRemove={() => onRemove(item.id)} />
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <PlayCircle className="h-12 w-12 text-white opacity-80" />
                    </div>
                </div>
            </a>
            
            <div className="pt-4 mt-auto">
                <Button asChild variant="secondary" className="w-full rounded-xl font-bold">
                    <a href={isLocked ? '#' : item.videoUrl || '#'} onClick={isLocked ? handleLockedClick : undefined} target="_blank" rel="noopener noreferrer">
                        {isLocked ? <Lock className="ml-2 h-4 w-4" /> : <PlayCircle className="ml-2 h-4 w-4" />}
                        {isLocked ? 'الترقية للمشاهدة' : 'مشاهدة الفيديو'}
                    </a>
                </Button>
            </div>
        </div>
    );
};


// A component for Downloadable items (Style 1/2/5)
const DownloadItemCard = ({ item, onRemove, onImageClick, isLocked }: { item: WithId<ContentItem>, onRemove: (id: string) => void, onImageClick: (url: string) => void, isLocked: boolean }) => {
    const router = useRouter();
    return (
        <div className="flex flex-col text-center group gap-y-3 bg-card p-4 rounded-[2.5rem] shadow-md border-none">
            <h3 className="font-bold text-base text-foreground min-h-[2.5rem] flex items-center justify-center px-2">{item.title}</h3>
            {item.imageUrl && (
              <div className="relative w-full cursor-pointer aspect-square bg-muted rounded-2xl shadow-sm overflow-hidden" onClick={() => !isLocked && onImageClick(item.imageUrl!)}>
                <RemoveButton onRemove={() => onRemove(item.id)} />
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
              </div>
            )}
            <div className="w-full mt-auto">
              <Button className="w-full rounded-xl font-bold h-11" disabled={isLocked} onClick={() => isLocked ? router.push('/pricing') : (item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                {isLocked ? <Lock className="ml-2 h-4 w-4" /> : <Download className="ml-2 h-4 w-4" />}
                {isLocked ? 'الترقية للتحميل' : 'تحميل'}
              </Button>
            </div>
        </div>
    );
};


export default function FavoritesPage() {
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { isPro, isAdmin } = useUserProfile();

  const removeFromFavorites = (itemId: string) => {
    setFavorites(prevFavorites => prevFavorites.filter(item => item.id !== itemId));
    toast({ title: "تمت الإزالة من المفضلة" });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="المفضلة" />
      <main className="flex-1 px-6 pt-4 pb-24">
        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {favorites.map((item) => {
              const isLocked = item.visibility === 'pro' && !isPro && !isAdmin;
              if (item.prompt) {
                return <PromptItemCard key={item.id} item={item} onRemove={removeFromFavorites} onImageClick={setSelectedImage} isLocked={isLocked} />;
              }
              if (item.videoUrl) {
                return <VideoItemCard key={item.id} item={item} onRemove={removeFromFavorites} isLocked={isLocked} />;
              }
              return <DownloadItemCard key={item.id} item={item} onRemove={removeFromFavorites} onImageClick={setSelectedImage} isLocked={isLocked} />;
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-12 mt-10 bg-card rounded-[2.5rem] shadow-sm">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="font-bold text-xl">قائمة المفضلة فارغة</h3>
            <p className="mt-2 text-sm">أضف بعض المحتوى إلى مفضلتك لتجده هنا لاحقاً.</p>
          </div>
        )}
      </main>
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none overflow-hidden rounded-3xl">
          <div className="sr-only">معاينة الصورة</div>
          {selectedImage && (
            <div className="relative w-full h-[85vh]">
                <Image src={selectedImage} alt="Preview" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}