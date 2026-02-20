'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ContentItem, DisplayStyle } from '@/lib/definitions';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download, Copy, Trash2, Heart, PlayCircle, Lock, Crown, Eye, ExternalLink, Sparkles, X, Music, Play, Pause, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { WithId } from '@/firebase';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { cn, getDirectDriveLink } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

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

const AudioPlayerRow = ({ 
    item, 
    onRemove,
    activeId,
    onPlay
}: { 
    item: FavoriteItem, 
    onRemove: () => void,
    activeId: string | null,
    onPlay: (id: string | null) => void
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loadError, setLoadError] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    const directAudioUrl = useMemo(() => getDirectDriveLink(item.audioUrl), [item.audioUrl]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            setLoadError(false);
            setCurrentTime(0);
            if (isPlaying) setIsPlaying(false);
        }
    }, [directAudioUrl]);

    useEffect(() => {
        if (activeId !== item.id && isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
        }
    }, [activeId, item.id, isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
            setLoadError(false);
        };
        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const onEnded = () => {
            setIsPlaying(false);
            if (activeId === item.id) onPlay(null);
        };
        const onError = () => {
            console.error("Audio Load Error (Fav):", {
                title: item.title,
                code: audio.error?.code,
                url: directAudioUrl
            });
            setLoadError(true);
            setIsPlaying(false);
            if (activeId === item.id) onPlay(null);
            
            if (activeId === item.id) {
                toast({
                    title: "فشل تشغيل الملف الصوتي",
                    description: "تأكد من أن الرابط مباشر أو متاح للجميع في Google Drive.",
                    variant: "destructive"
                });
            }
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, [activeId, item.id, onPlay, toast, item.title, directAudioUrl]);

    const togglePlay = async () => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            onPlay(null);
        } else {
            try {
                setLoadError(false);
                await audioRef.current.play();
                setIsPlaying(true);
                onPlay(item.id);
            } catch (err) {
                console.error("Fav Playback start failed:", err);
                setLoadError(true);
                toast({ 
                    title: "فشل تشغيل الملف", 
                    description: "تأكد من إعدادات المشاركة للملف في Google Drive.",
                    variant: "destructive" 
                });
            }
        }
    };

    const handleSliderChange = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    return (
        <div className={cn(
            "flex flex-col gap-3 p-5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-primary/10 shadow-lg group animate-in fade-in slide-in-from-bottom-2 duration-500 relative",
            loadError && "border-destructive/30 bg-destructive/5"
        )}>
            <audio 
                ref={audioRef} 
                src={directAudioUrl || undefined} 
                preload="metadata" 
                referrerPolicy="no-referrer" 
            />
            
            <div className="flex items-center gap-4">
                {/* Left Side: Play Control (to match image layout in RTL) */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={togglePlay}
                        disabled={loadError}
                        className={cn(
                            "h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-90 transition-all",
                            loadError && "opacity-50 grayscale"
                        )}
                    >
                        {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 ml-1 fill-current" />}
                    </button>
                </div>

                {/* Center: Title & Time */}
                <div className="flex-1 min-w-0 text-center">
                    <p className={cn("font-black text-lg truncate leading-tight", loadError ? "text-destructive" : "text-foreground")}>{item.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '--:--'}
                    </p>
                </div>

                {/* Right Side: Music Icon */}
                <div className={cn(
                    "h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shrink-0 relative overflow-hidden shadow-inner border border-primary/5",
                    loadError && "bg-destructive/10 text-destructive"
                )}>
                    {loadError ? <AlertCircle className="h-7 w-7" /> : <Music className={cn("h-7 w-7 transition-transform", isPlaying && "animate-bounce")} />}
                </div>
            </div>

            {/* Bottom Row: Slider & Remove */}
            <div className="flex items-center gap-4 pt-1">
                <button 
                    onClick={onRemove}
                    className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive transition-all active:scale-90"
                    title="إزالة من المفضلة"
                >
                    <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex-1 px-1">
                    <Slider 
                        value={[currentTime]} 
                        max={duration || 100} 
                        step={0.1}
                        onValueChange={handleSliderChange}
                        className="cursor-pointer"
                        disabled={loadError}
                    />
                </div>
            </div>
        </div>
    );
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteItem[]>('favorites', []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
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

    if (style === 'style7') {
        return (
            <AudioPlayerRow 
                key={item.id} 
                item={item} 
                onRemove={() => removeFromFavorites(item.id)}
                activeId={activeAudioId}
                onPlay={setActiveAudioId}
            />
        );
    }

    if (style === 'style3') {
        return (
            <div key={item.id} className="flex flex-col gap-4 animate-in fade-in duration-500">
                <h3 className="font-black text-xl text-center text-primary px-4">{item.title}</h3>
                <div 
                    className="relative w-full rounded-[2.5rem] overflow-hidden bg-muted group shadow-2xl border-4 border-white/5 cursor-zoom-in"
                    onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}
                >
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="block w-full h-auto group-hover:scale-105 transition-transform duration-500" />}
                    <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                        <Eye className="text-white h-12 w-12" />
                    </div>
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
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="block w-full h-auto" />}
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
