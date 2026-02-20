'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ContentItem, DisplayStyle } from '@/lib/definitions';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download, Copy, Trash2, Heart, PlayCircle, Lock, Crown, Eye, ExternalLink, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { WithId } from '@/firebase';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type FavoriteItem = WithId<ContentItem> & { displayStyle?: DisplayStyle };

const RemoveButton = ({ onRemove }: { onRemove: () => void }) => (
  <Button
    size="icon"
    className="absolute top-3 left-3 z-20 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-destructive hover:scale-110 transition-all shadow-lg"
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
  >
    <Trash2 className="h-5 w-5" />
  </Button>
);

export default function FavoritesPage() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteItem[]>('favorites', []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { isPro, isAdmin, isEditor } = useUserProfile();
  const router = useRouter();

  const removeFromFavorites = (itemId: string) => {
    setFavorites(prevFavorites => prevFavorites.filter(item => item.id !== itemId));
    toast({ title: "تمت الإزالة من المفضلة" });
  };

  const handleAction = (item: FavoriteItem, action: () => void) => {
      const isLocked = item.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
      if (isLocked) {
          router.push('/pricing');
      } else {
          action();
      }
  };

  const renderFavoriteItem = (item: FavoriteItem) => {
    const style = item.displayStyle || 'style1';
    const isLocked = item.visibility === 'pro' && !isPro && !isAdmin && !isEditor;

    if (style === 'style3') {
        return (
            <div key={item.id} className="flex flex-col gap-4 animate-in fade-in duration-500">
                <h3 className="font-black text-xl text-center text-primary px-4">{item.title}</h3>
                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-muted group shadow-2xl border-4 border-white/5">
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                    <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
                </div>
                <div className="space-y-2 px-2">
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">نص البرومبت:</p>
                    <Textarea readOnly value={item.prompt || ''} className="h-28 bg-muted/50 border-none rounded-2xl text-xs font-mono p-4 shadow-inner" dir="ltr" />
                </div>
                <div className="flex gap-3 px-2">
                    <Button 
                        className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-primary/20" 
                        onClick={() => handleAction(item, () => { if(item.prompt) { navigator.clipboard.writeText(item.prompt); toast({title:"تم النسخ"}); } })}
                    >
                        نسخ البرومبت
                    </Button>
                    {item.downloadUrl && (
                        <Button 
                            variant="outline" 
                            className="h-14 w-14 rounded-2xl border-2 border-primary/20"
                            onClick={() => handleAction(item, () => window.open(item.downloadUrl, '_blank'))}
                        >
                            <Download className="h-6 w-6 text-primary" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (style === 'style4') {
        return (
            <div key={item.id} className="flex flex-col gap-4 group animate-in fade-in duration-500">
                <div className="text-center px-4 relative">
                    <h3 className="font-black text-2xl mb-1 tracking-tight">{item.title}</h3>
                    <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
                </div>
                <div className="relative aspect-video bg-black overflow-hidden rounded-[3rem] shadow-2xl cursor-pointer" onClick={() => handleAction(item, () => item.videoUrl && window.open(item.videoUrl, '_blank'))}>
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover opacity-80" />}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-primary/90 text-white p-6 rounded-full shadow-2xl scale-90 backdrop-blur-sm">
                            <PlayCircle className="h-14 w-14" />
                        </div>
                    </div>
                    {isLocked && <div className="absolute top-6 left-6 bg-yellow-500 text-white p-2 rounded-full border-2 border-white/20"><Crown className="h-5 w-5" /></div>}
                </div>
            </div>
        );
    }

    if (style === 'style5') {
        return (
            <Card key={item.id} className="overflow-hidden rounded-[3.5rem] border border-white/20 bg-primary/5 backdrop-blur-3xl shadow-xl transition-all duration-500 animate-in fade-in">
                <div className="p-8">
                    <div className="flex items-start gap-6 mb-8">
                        <div className="h-24 w-24 rounded-[2.2rem] bg-card relative overflow-hidden shrink-0 shadow-2xl border-4 border-white/10">
                            {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                        </div>
                        <div className="flex-1 pt-2">
                            <h3 className="text-3xl font-black leading-tight text-foreground">{item.title}</h3>
                            {item.appVersion && (
                                <span className="inline-flex items-center gap-1.5 mt-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black">
                                    <Sparkles className="h-3 w-3" />
                                    إصدار {item.appVersion}
                                </span>
                            )}
                        </div>
                        <Button size="icon" variant="ghost" className="h-12 w-12 bg-destructive/10 text-destructive rounded-2xl hover:bg-destructive/20" onClick={() => removeFromFavorites(item.id)}>
                            <Trash2 className="h-6 w-6" />
                        </Button>
                    </div>
                    {item.screenshots && item.screenshots.length > 0 && (
                        <div className="mb-8 -mx-4">
                            <div className="overflow-x-auto no-scrollbar pb-2" dir="rtl">
                                <div className="flex gap-4 px-4">
                                    {item.screenshots.map((shot, idx) => (
                                        <div key={idx} className="relative h-[280px] w-[160px] rounded-[2rem] overflow-hidden bg-muted shrink-0 shadow-lg cursor-zoom-in" onClick={() => setSelectedImage(shot)}>
                                            <Image src={shot} alt="" fill className="object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <Button 
                        className="w-full h-16 rounded-[2.2rem] font-black text-xl shadow-lg bg-primary"
                        onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}
                    >
                        <Download className="ml-3 h-6 w-6" />
                        تحميل
                    </Button>
                </div>
            </Card>
        );
    }

    if (style === 'style6') {
        return (
            <div key={item.id} className="flex flex-col gap-5 animate-in fade-in duration-500">
                <div className="text-center px-4 relative">
                    <h3 className="font-black text-2xl tracking-tight mb-1">{item.title}</h3>
                    <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
                </div>
                <div className="relative aspect-video w-full rounded-[3rem] overflow-hidden shadow-2xl group cursor-pointer border-4 border-white/10" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                    {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[2px]">
                        <ExternalLink className="text-white h-14 w-14" />
                    </div>
                </div>
                <Button className="w-full rounded-[2rem] font-black h-16 text-xl shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>زيارة الموقع الآن</Button>
            </div>
        );
    }

    if (style === 'style2') {
        return (
            <div key={item.id} className="flex flex-col gap-6 animate-in fade-in duration-500">
                <div className="text-center px-4 relative">
                    <h3 className="font-black text-2xl text-foreground tracking-tight">{item.title}</h3>
                    <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
                </div>
                <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl cursor-zoom-in" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-auto" />}
                </div>
                <Button className="w-full rounded-[2rem] font-black h-16 text-xl shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                    <Download className="ml-3 h-6 w-6" />
                    تحميل
                </Button>
            </div>
        );
    }

    // Default Style 1 (Grid)
    return (
        <div key={item.id} className="flex flex-col gap-4 animate-in fade-in duration-500">
            <h3 className="font-black text-base text-center truncate px-2 text-foreground tracking-tight">{item.title}</h3>
            <div className="relative aspect-square w-full rounded-[2.2rem] overflow-hidden shadow-xl cursor-zoom-in" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />}
                <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
            </div>
            <Button className="w-full rounded-[1.5rem] h-14 font-black shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                <Download className="ml-2 h-5 w-5" />
                تحميل
            </Button>
        </div>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="المفضلة" />
      <main className="flex-1 px-6 pt-4 pb-24">
        {favorites.length > 0 ? (
          <div className="space-y-12 mt-6">
            {favorites.map((item) => renderFavoriteItem(item))}
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
          <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors z-50 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
            <X className="h-6 w-6" />
          </button>
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
