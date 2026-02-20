'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem, DisplayStyle } from '@/lib/definitions';
import { ArrowLeft, Download, Search, Heart, Crown, Hammer, ExternalLink, LayoutGrid, PlayCircle, Eye, X, Sparkles, Music, Play, Pause, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { cn, getDirectDriveLink } from '@/lib/utils';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type FavoriteItem = WithId<ContentItem> & { displayStyle?: DisplayStyle };

const AudioPlayerRow = ({ 
    item, 
    isFavorite, 
    onToggleFavorite, 
    onAction,
    activeId,
    onPlay
}: { 
    item: WithId<ContentItem>, 
    isFavorite: boolean, 
    onToggleFavorite: () => void,
    onAction: (action: () => void) => void,
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

    // Force reload when URL changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            setLoadError(false);
            setCurrentTime(0);
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
            const error = audio.error;
            console.error("Audio Load Error Details:", {
                title: item.title,
                code: error?.code,
                message: error?.message,
                url: directAudioUrl
            });
            
            setLoadError(true);
            setIsPlaying(false);
            if (activeId === item.id) onPlay(null);
            
            if (activeId === item.id) {
                toast({
                    title: "تعذر تشغيل الصوت",
                    description: "تأكد من أن الملف عام (Public) في Google Drive وأن الرابط صحيح.",
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
    }, [activeId, item.id, onPlay, item.title, toast, directAudioUrl]);

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
                console.error("Playback start failed:", err);
                setLoadError(true);
                toast({ 
                    title: "خطأ في التشغيل", 
                    description: "الملف قد يكون كبيراً جداً للتشغيل المباشر أو محمي.",
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
            "flex items-center gap-4 p-4 bg-primary/5 backdrop-blur-xl rounded-[2.2rem] border border-primary/10 group animate-in fade-in slide-in-from-bottom-2 duration-500",
            loadError && "border-destructive/30 bg-destructive/5"
        )}>
            <audio 
                ref={audioRef} 
                src={directAudioUrl} 
                preload="metadata"
                referrerPolicy="no-referrer"
            />
            
            <div className={cn(
                "h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 relative overflow-hidden shadow-inner",
                loadError && "bg-destructive/10 text-destructive"
            )}>
                {loadError ? <AlertCircle className="h-6 w-6" /> : <Music className={cn("h-6 w-6 transition-transform duration-500", isPlaying && "animate-bounce")} />}
                {item.isNew && !loadError && <div className="absolute top-0 right-0 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-white" />}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
                <p className={cn("font-black text-sm truncate px-1", loadError && "text-destructive")}>{item.title}</p>
                <div className="flex items-center gap-3">
                    <Slider 
                        value={[currentTime]} 
                        max={duration || 100} 
                        step={0.1}
                        onValueChange={handleSliderChange}
                        className="flex-1 cursor-pointer"
                        disabled={loadError}
                    />
                    <span className="text-[9px] font-mono opacity-40 w-10 text-center">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button 
                    onClick={togglePlay}
                    disabled={loadError}
                    className={cn(
                        "h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all",
                        loadError && "opacity-50 grayscale cursor-not-allowed"
                    )}
                >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
                {item.downloadUrl && (
                    <button 
                        onClick={() => onAction(() => window.open(item.downloadUrl, '_blank'))}
                        className="h-10 w-10 rounded-full bg-card/50 backdrop-blur-md flex items-center justify-center text-primary border border-primary/10 hover:bg-primary/10 active:scale-90 transition-all"
                    >
                        <Download className="h-5 w-5" />
                    </button>
                )}
                <button 
                    onClick={onToggleFavorite}
                    className="h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                >
                    <Heart className={cn("h-5 w-5 text-muted-foreground", isFavorite && "text-primary fill-primary scale-110")} />
                </button>
            </div>
        </div>
    );
};

const WalkingEngineer = () => (
    <div className="relative flex flex-col items-center justify-center py-10">
        <div className="animate-walk mb-4">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4C13.1046 4 14 3.10457 14 2C14 0.89543 13.1046 0 12 0C10.8954 0 10 0.89543 10 2C10 3.10457 10.8954 4 12 4Z" fill="currentColor" className="text-primary"/>
                <path d="M15 5H9C7.34315 5 6 6.34315 6 8V14C6 14.5523 6.44772 15 7 15H8V21C8 22.6569 9.34315 24 11 24H13C14.6569 24 16 22.6569 16 21V15H17C17.5523 15 18 14.5523 18 14V8C18 6.34315 16.6569 5 15 5Z" fill="currentColor" className="text-primary opacity-80"/>
                <rect x="10" y="6" width="4" height="2" fill="white" className="opacity-20"/>
                <path d="M19 10L21 12M21 12L23 10M21 12L20 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary"/>
            </svg>
        </div>
        <div className="w-16 h-2 bg-black/10 rounded-full blur-md animate-float-shadow" />
    </div>
);

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const firestore = useFirestore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<FavoriteItem[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const categoryRef = useMemoFirebase(() => id ? doc(firestore!, 'categories', id) : null, [firestore, id]);
  const { data: category, isLoading: isCategoryLoading } = useDoc<CategoryType>(categoryRef);

  const { subCategories } = useCategories();
  const currentSubCategories = useMemo(() => id ? subCategories.get(id) || [] : [], [subCategories, id]);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !id) return null;
      return query(collection(firestore, 'categories', id, 'items'));
  }, [firestore, id]);
  const { data: rawItems, isLoading: areItemsLoading } = useCollection<ContentItem>(itemsQuery);

  const isFavorite = (itemId: string) => favorites.some(item => item.id === itemId);

  const toggleFavorite = (item: WithId<ContentItem>) => {
    const isCurrentlyFavorite = isFavorite(item.id);
    if (isCurrentlyFavorite) {
      setFavorites(prev => prev.filter(fav => fav.id !== item.id));
      toast({ title: "تمت الإزالة من المفضلة" });
    } else {
      setFavorites(prev => [...prev, { ...item, displayStyle: category?.displayStyle || 'style1' }]);
      toast({ title: "تمت الإضافة إلى المفضلة" });
    }
  };

  const filteredItems = useMemo(() => {
    if (!rawItems) return [];
    const viewableItems = (isAdmin || isEditor) ? rawItems : rawItems.filter(item => !item.status || item.status === 'approved');
    const searchedItems = viewableItems.filter((item) => (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()));
    return [...searchedItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawItems, searchTerm, isAdmin, isEditor]);

  const handleAction = (item: WithId<ContentItem>, action: () => void) => {
      const isLocked = item.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
      if (isLocked) {
          setShowUpgradeDialog(true);
      } else {
          action();
      }
  };

  const handleSubCategoryClick = (sub: WithId<CategoryType>) => {
      const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
      if (isLocked) {
          setShowUpgradeDialog(true);
      } else {
          router.push(`/categories/${sub.id}`);
      }
  };

  const isMaintenanceOn = category?.isUnderMaintenance && !isAdmin && !isEditor;
  const isLoading = (isCategoryLoading || areItemsLoading || isUserLoading) && !isMaintenanceOn;

  const renderContent = () => {
    if (isMaintenanceOn) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-10 bg-card/40 backdrop-blur-3xl rounded-[3.5rem] mt-8 shadow-2xl border border-white/20 min-h-[500px] animate-in fade-in zoom-in duration-700">
            <WalkingEngineer />
            <div className="space-y-4 mt-4">
                <h3 className="font-black text-3xl text-foreground tracking-tight">نطور من أجلك</h3>
                <p className="text-muted-foreground text-base max-w-xs mx-auto leading-relaxed font-bold opacity-80">
                    المهندس يعمل الآن على إضافة لمسات إبداعية لهذا القسم. سنكون جاهزين قريباً جداً!
                </p>
            </div>
            <div className="flex items-center gap-2 mt-10 py-2.5 px-5 bg-primary/10 rounded-full border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-[11px] font-black text-primary uppercase tracking-widest">تحديثات جارية الآن</span>
            </div>
            <Button variant="default" onClick={() => router.back()} className="mt-12 rounded-2xl px-12 h-14 font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
                <ArrowLeft className="ml-2 h-6 w-6" /> العودة للرئيسية
            </Button>
         </div>
       )
    }

    if (!isLoading && filteredItems.length === 0 && currentSubCategories.length === 0) return (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-[2.5rem] mt-4 shadow-sm border border-dashed">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-black">لا يوجد محتوى متاح حالياً.</p>
        </div>
    );

    const typedItems = filteredItems as WithId<ContentItem>[];
    const displayStyle = category?.displayStyle || 'style1';

    return (
        <div className="space-y-10">
            {currentSubCategories.length > 0 && (
                <div className="space-y-4">
                    {displayStyle === 'style7' ? (
                        <ScrollArea className="w-full">
                            <div className="flex items-center gap-3 pb-4">
                                {currentSubCategories.map(sub => {
                                    const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
                                    return (
                                        <button 
                                            key={sub.id} 
                                            onClick={() => handleSubCategoryClick(sub)}
                                            className="px-6 py-3 rounded-full bg-primary/10 text-primary font-black whitespace-nowrap border border-primary/10 hover:bg-primary hover:text-white transition-all active:scale-95 relative"
                                        >
                                            {sub.name}
                                            {isLocked && <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 fill-yellow-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" className="hidden" />
                        </ScrollArea>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 px-1 opacity-60">
                                <LayoutGrid className="h-4 w-4 text-primary" />
                                <h4 className="text-xs font-black uppercase tracking-widest">أقسام فرعية</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {currentSubCategories.map(sub => {
                                    const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
                                    return (
                                        <div key={sub.id} onClick={() => handleSubCategoryClick(sub)}>
                                            <div className="relative bg-primary text-primary-foreground p-4 rounded-[2.2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-lg aspect-square text-center active:scale-95 group overflow-hidden border-4 border-white/5">
                                                <div className="absolute -bottom-4 -right-4 bg-white/10 w-16 h-16 rounded-full group-hover:scale-150 transition-transform duration-500" />
                                                {isLocked && <Crown className="absolute top-3 left-3 h-5 w-5 text-yellow-300 drop-shadow-md z-20" />}
                                                {sub.fileTypes && (
                                                    <div className="absolute top-3.5 right-3.5 bg-black/20 text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase backdrop-blur-sm z-20">
                                                        {sub.fileTypes}
                                                    </div>
                                                )}
                                                <p className="font-bold text-lg relative z-10 leading-tight">{sub.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {typedItems.length > 0 && (
                <div className="space-y-12">
                    {displayStyle === 'style7' ? (
                        <div className="space-y-4">
                            {typedItems.map(item => (
                                <AudioPlayerRow 
                                    key={item.id} 
                                    item={item} 
                                    isFavorite={isFavorite(item.id)} 
                                    onToggleFavorite={() => toggleFavorite(item)}
                                    onAction={(action) => handleAction(item, action)}
                                    activeId={activeAudioId}
                                    onPlay={setActiveAudioId}
                                />
                            ))}
                        </div>
                    ) : displayStyle === 'style3' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="font-black text-xl text-center text-primary px-4">{item.title}</h3>
                                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-muted group shadow-2xl border-4 border-white/5">
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />}
                                        <button 
                                            className="absolute top-3 left-3 z-10 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all hover:bg-primary hover:scale-110 shadow-lg active:scale-90"
                                            onClick={() => toggleFavorite(item)}
                                        >
                                            <Heart className={cn("h-5 w-5 text-white transition-all", isFavorite(item.id) && "fill-white text-white scale-110")} />
                                        </button>
                                    </div>
                                    <div className="space-y-2 px-2">
                                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">نص البرومبت:</p>
                                        <Textarea readOnly value={item.prompt || ''} className="h-28 bg-muted/50 border-none rounded-2xl text-xs font-mono p-4 shadow-inner" dir="ltr" />
                                    </div>
                                    <div className="flex gap-3 px-2">
                                        <Button 
                                            className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" 
                                            onClick={() => handleAction(item, () => { if(item.prompt) { navigator.clipboard.writeText(item.prompt); toast({title:"تم النسخ بنجاح"}); } })}
                                        >
                                            نسخ البرومبت
                                        </Button>
                                        {item.downloadUrl && (
                                            <Button 
                                                variant="outline" 
                                                className="h-14 w-14 rounded-2xl border-2 hover:bg-primary/10 transition-all border-primary/20 active:scale-90"
                                                onClick={() => handleAction(item, () => window.open(item.downloadUrl, '_blank'))}
                                            >
                                                <Download className="h-6 w-6 text-primary" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayStyle === 'style4' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 group animate-in fade-in slide-in-from-bottom-6 duration-700">
                                    <div className="text-center px-4 relative">
                                        <h3 className="font-black text-2xl mb-1 tracking-tight">{item.title}</h3>
                                        <button 
                                            className="absolute top-0 right-4 h-8 w-8 text-primary active:scale-90"
                                            onClick={() => toggleFavorite(item)}
                                        >
                                            <Heart className={cn("h-6 w-6 transition-all", isFavorite(item.id) && "fill-primary")} />
                                        </button>
                                        {item.isNew && <span className="text-[10px] text-green-500 font-black animate-pulse bg-green-50 px-3 py-0.5 rounded-full border border-green-100">جديد</span>}
                                    </div>
                                    <div className="relative aspect-video bg-black overflow-hidden rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] group cursor-pointer" onClick={() => handleAction(item, () => item.videoUrl && window.open(item.videoUrl, '_blank'))}>
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-1000" />}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-primary/90 text-white p-6 rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-all duration-500 backdrop-blur-sm">
                                                <PlayCircle className="h-14 w-14" />
                                            </div>
                                        </div>
                                        {item.visibility === 'pro' && !isPro && !isAdmin && !isEditor && <div className="absolute top-6 left-6 bg-yellow-500 text-white p-2 rounded-full shadow-2xl border-2 border-white/20"><Crown className="h-5 w-5" /></div>}
                                    </div>
                                    <div className="px-6 text-center">
                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-bold opacity-70">{item.instructions || 'شاهد شرح المحتوى بالفيديو للحصول على أفضل النتائج.'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayStyle === 'style5' ? (
                        <div className="space-y-12">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[3.5rem] border border-white/20 bg-primary/5 backdrop-blur-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_35px_80px_-15px_rgba(0,0,0,0.15)] transition-all duration-500 group/card">
                                    <div className="p-8 sm:p-10">
                                        <div className="flex items-start gap-6 mb-8">
                                            <div className="h-24 w-24 rounded-[2.2rem] bg-card relative overflow-hidden shrink-0 shadow-2xl border-4 border-white/10 group-hover/card:scale-105 transition-transform duration-500">
                                                {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                                            </div>
                                            <div className="flex-1 pt-2">
                                                <h3 className="text-3xl font-black leading-tight text-foreground">{item.title}</h3>
                                                {item.appVersion && (
                                                    <span className="inline-flex items-center gap-1.5 mt-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black border border-primary/10">
                                                        <Sparkles className="h-3 w-3" />
                                                        إصدار {item.appVersion}
                                                    </span>
                                                )}
                                            </div>
                                            <button className="h-12 w-12 bg-card/50 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all hover:bg-primary/10 hover:scale-110 shadow-sm border border-white/10 active:scale-90" onClick={() => toggleFavorite(item)}>
                                                <Heart className={cn("h-6 w-6 text-muted-foreground transition-all", isFavorite(item.id) && "text-primary fill-primary scale-110")} />
                                            </button>
                                        </div>
                                        {item.instructions && (
                                            <div className="mb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="p-6 rounded-[2rem] bg-card/30 border border-white/10 shadow-inner">
                                                    <p className="text-sm text-foreground/70 font-bold leading-relaxed">{item.instructions}</p>
                                                </div>
                                            </div>
                                        )}
                                        {item.screenshots && item.screenshots.length > 0 && (
                                            <div className="mb-12 -mx-4">
                                                <div className="overflow-x-auto no-scrollbar pb-4" dir="rtl">
                                                    <div className="flex gap-6 px-4">
                                                        {item.screenshots.map((shot, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                className="relative h-[420px] w-[230px] rounded-[2.5rem] overflow-hidden bg-muted shrink-0 shadow-[0_15px_40px_rgba(0,0,0,0.2)] cursor-zoom-in group/img"
                                                                onClick={() => setSelectedImage(shot)}
                                                            >
                                                                <Image src={shot} alt="" fill className="object-cover group-hover/img:scale-110 transition-transform duration-1000" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <Button 
                                            className="w-full h-20 rounded-[2.2rem] font-black text-xl shadow-[0_15px_40px_rgba(var(--primary),0.3)] hover:shadow-[0_20px_50px_rgba(var(--primary),0.4)] hover:scale-[1.02] active:scale-95 transition-all bg-primary relative overflow-hidden group/btn"
                                            onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}
                                        >
                                            <Download className="ml-3 h-7 w-7 group-hover/btn:translate-y-1 transition-transform relative z-10" />
                                            <span className="relative z-10">تحميل</span>
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : displayStyle === 'style6' ? (
                        <div className="grid grid-cols-1 gap-12">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-5 group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center px-4 relative">
                                        <h3 className="font-black text-2xl tracking-tight mb-1">{item.title}</h3>
                                        <button 
                                            className="absolute top-0 right-4 h-8 w-8 text-primary active:scale-90"
                                            onClick={() => toggleFavorite(item)}
                                        >
                                            <Heart className={cn("h-6 w-6 transition-all", isFavorite(item.id) && "fill-primary")} />
                                        </button>
                                        <p className="text-sm text-muted-foreground font-bold opacity-60">{item.instructions || 'تصفح الموقع الإلكتروني وتعرف على المزيد.'}</p>
                                    </div>
                                    <div className="relative aspect-video w-full rounded-[3rem] overflow-hidden shadow-2xl group cursor-pointer border-4 border-white/10" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />}
                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                                            <ExternalLink className="text-white h-14 w-14 scale-75 group-hover:scale-100 transition-transform" />
                                        </div>
                                    </div>
                                    <div className="px-2 mt-2">
                                        <Button className="w-full rounded-[2rem] font-black h-16 text-xl shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>زيارة الموقع الآن</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayStyle === 'style2' ? (
                        <div className="grid grid-cols-1 gap-14 mt-4">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="text-center px-4 relative">
                                        <h3 className="font-black text-2xl text-foreground tracking-tight">{item.title}</h3>
                                        <button 
                                            className="absolute top-0 right-4 h-8 w-8 text-primary active:scale-90"
                                            onClick={() => toggleFavorite(item)}
                                        >
                                            <Heart className={cn("h-6 w-6 transition-all", isFavorite(item.id) && "fill-primary")} />
                                        </button>
                                        {item.isNew && <span className="text-[10px] text-green-500 font-black animate-pulse block mt-1 uppercase tracking-tighter">New Update</span>}
                                    </div>
                                    <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] group cursor-zoom-in" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                                        {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-auto group-hover:scale-105 transition-transform duration-1000" />}
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye className="text-white h-12 w-12" />
                                        </div>
                                    </div>
                                    <div className="px-2">
                                        <Button className="w-full rounded-[2rem] font-black h-16 text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                                            <Download className="ml-3 h-6 w-6 relative z-10 group-hover:translate-y-1 transition-transform" />
                                            <span className="relative z-10">تحميل</span>
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-12">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="font-black text-base text-center truncate px-2 text-foreground tracking-tight">{item.title}</h3>
                                    <div className="relative aspect-square w-full rounded-[2.2rem] overflow-hidden shadow-xl group cursor-zoom-in" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                                        {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />}
                                        <button 
                                            className="absolute top-3 left-3 z-10 h-8 w-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all hover:bg-primary active:scale-90"
                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                                        >
                                            <Heart className={cn("h-4 w-4 text-white transition-all", isFavorite(item.id) && "fill-white scale-110")} />
                                        </button>
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                            <Eye className="text-white h-8 w-8" />
                                        </div>
                                        {item.isNew && <div className="absolute top-3 right-3 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10 shadow-lg">جديد</div>}
                                    </div>
                                    <Button className="w-full rounded-[1.5rem] h-14 font-black shadow-xl shadow-primary/10 hover:scale-[1.05] active:scale-90 transition-all relative overflow-hidden group" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                                        <Download className="ml-2 h-5 w-5 relative z-10 group-hover:translate-y-0.5 transition-transform" />
                                        <span className="relative z-10">تحميل</span>
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  };
  
  return (
    <div className="flex min-h-dvh flex-col bg-secondary overflow-x-hidden">
        <div className="sticky top-0 z-30">
             <Header showMenu={false} title={isLoading ? '...' : (category?.name || "تحميل...")}>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
             </Header>
            <div className="relative z-10 -mt-12">
              <div className="pb-4 px-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input placeholder="ابحث في هذا القسم..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-lg shadow-2xl focus:ring-4 focus:ring-primary/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
        </div>
      <main className="flex-1 px-6 pt-4 pb-24">
        {!isLoading && !category ? (
            <div className="text-center text-destructive p-12 bg-destructive/10 rounded-[2.5rem] mt-4 space-y-4">
                <X className="mx-auto h-12 w-12" />
                <h3 className="font-black text-xl">عفواً، لم نجد هذا القسم</h3>
                <Button variant="outline" onClick={() => router.push('/home')} className="rounded-xl border-2">العودة للرئيسية</Button>
            </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4 mt-6">
             {[...Array(4)].map((_, i) => <CategorySkeleton key={i} className="aspect-square rounded-[2rem]" />)}
          </div>
        ) : renderContent()}
      </main>
      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none overflow-hidden rounded-3xl">
          <div className="sr-only">معاينة الصورة</div>
          <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-colors z-50 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
            <X className="h-6 w-6" />
          </button>
          {selectedImage && (
            <div className="relative w-full h-[85vh]">
                <Image src={selectedImage} alt="" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
