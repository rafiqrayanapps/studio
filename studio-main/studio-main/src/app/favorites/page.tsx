'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import type { ContentItem, DisplayStyle } from '@/lib/definitions';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Heart, X, Music, Play, Pause, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WithId } from '@/firebase';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { cn, getDirectDriveLink } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type FavoriteItem = WithId<ContentItem> & { displayStyle?: DisplayStyle };

const RemoveButton = ({ onRemove }: { onRemove: () => void }) => (
  <Button
    size="icon"
    className="absolute top-4 left-4 z-20 h-10 w-10 bg-white/90 backdrop-blur-sm rounded-full text-destructive hover:bg-destructive hover:text-white hover:scale-110 transition-all shadow-lg border border-black/5"
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

        const setAudioData = () => { setDuration(audio.duration); setLoadError(false); };
        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const onEnded = () => { setIsPlaying(false); if (activeId === item.id) onPlay(null); };
        const onError = () => { setLoadError(true); setIsPlaying(false); if (activeId === item.id) onPlay(null); };

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
    }, [activeId, item.id, onPlay]);

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
            } catch (err) { setLoadError(true); }
        }
    };

    return (
        <div className={cn(
            "flex flex-col gap-3 p-5 bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-primary/10 shadow-lg group animate-in fade-in slide-in-from-bottom-2 duration-500 relative",
            loadError && "border-destructive/30 bg-destructive/5"
        )}>
            <audio ref={audioRef} src={directAudioUrl || undefined} preload="metadata" referrerPolicy="no-referrer" />
            <div className="flex items-center gap-4">
                <button onClick={togglePlay} disabled={loadError} className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-90 transition-all">
                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 ml-1 fill-current" />}
                </button>
                <div className="flex-1 min-w-0 text-center">
                    <p className="font-black text-base truncate leading-tight">{item.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '--:--'}
                    </p>
                </div>
                <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {loadError ? <AlertCircle className="h-7 w-7 text-destructive" /> : <Music className={cn("h-7 w-7", isPlaying && "animate-bounce")} />}
                </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
                <button onClick={onRemove} className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive active:scale-90"><Trash2 className="h-4 w-4" /></button>
                <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={(v) => { if(audioRef.current) audioRef.current.currentTime = v[0]; }} className="flex-1" />
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
      if (isLocked) router.push('/pricing');
      else action();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="المفضلة" />
      <main className="flex-1 px-6 pt-4 pb-24">
        {favorites.length > 0 ? (
          <div className="space-y-12 mt-6">
            {favorites.map((item) => {
                const style = item.displayStyle || 'style1';
                if (style === 'style7') return <AudioPlayerRow key={item.id} item={item} onRemove={() => removeFromFavorites(item.id)} activeId={activeAudioId} onPlay={setActiveAudioId} />;
                return (
                    <div key={item.id} className="flex flex-col gap-4 animate-in fade-in duration-500">
                        <h3 className="font-black text-sm text-center truncate px-2">{item.title}</h3>
                        <div className="relative aspect-square w-full rounded-[2.2rem] overflow-hidden shadow-xl cursor-zoom-in" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                            {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />}
                            <RemoveButton onRemove={() => removeFromFavorites(item.id)} />
                        </div>
                        <Button className="w-full rounded-[1.5rem] h-14 font-black shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                            <Download className="ml-2 h-5 w-5" /> تحميل
                        </Button>
                    </div>
                );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-12 mt-10 bg-card rounded-[2.5rem] shadow-sm">
            <Heart className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="font-bold text-lg">قائمة المفضلة فارغة</h3>
            <p className="mt-2 text-xs">أضف بعض المحتوى إلى مفضلتك لتجده هنا لاحقاً.</p>
          </div>
        )}
      </main>
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none overflow-hidden rounded-3xl">
          <DialogTitle className="sr-only">معاينة الصورة</DialogTitle>
          <button className="absolute top-4 right-4 text-white bg-black/50 p-3 rounded-full z-50 backdrop-blur-md" onClick={() => setSelectedImage(null)}><X className="h-6 w-6" /></button>
          {selectedImage && <div className="relative w-full h-[85vh] flex items-center justify-center"><img src={selectedImage} alt="Preview" className="max-w-full max-h-full object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
