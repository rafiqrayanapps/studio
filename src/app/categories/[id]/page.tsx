'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, doc, orderBy, where } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem } from '@/lib/definitions';
import { ArrowLeft, Download, Search, Heart, Crown, Hammer, ExternalLink, PlayCircle, Eye, X, Sparkles, Music, Play, Pause, AlertCircle, Settings, Wrench, Cog, Construction } from 'lucide-react';
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
import { useUnityAds } from '@/components/ads/UnityAdsProvider';
import Image from 'next/image';

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

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            setLoadError(false);
            setCurrentTime(0);
            if (isPlaying) {
                setIsPlaying(false);
                if (activeId === item.id) onPlay(null);
            }
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
            setLoadError(true);
            setIsPlaying(false);
            if (activeId === item.id) onPlay(null);
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
            } catch (err) {
                setLoadError(true);
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
            "flex flex-col gap-3 p-4 bg-card/40 backdrop-blur-xl rounded-[2rem] border border-primary/10 shadow-lg group animate-in fade-in slide-in-from-bottom-2 duration-500 relative",
            loadError && "border-destructive/30 bg-destructive/5"
        )}>
            <audio 
                ref={audioRef} 
                src={directAudioUrl || undefined} 
                preload="metadata"
                referrerPolicy="no-referrer"
            />
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={togglePlay}
                        disabled={loadError}
                        className={cn(
                            "h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-90 transition-all",
                            loadError && "opacity-50 grayscale cursor-not-allowed"
                        )}
                    >
                        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 ml-1 fill-current" />}
                    </button>
                </div>

                <div className="flex-1 min-w-0 text-center">
                    <p className={cn("font-black text-sm truncate leading-tight", loadError ? "text-destructive" : "text-foreground")}>{item.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '--:--'}
                    </p>
                </div>

                <div className={cn(
                    "h-12 w-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary shrink-0 relative overflow-hidden shadow-inner border border-primary/5",
                    loadError && "bg-destructive/10 text-destructive"
                )}>
                    {loadError ? <AlertCircle className="h-6 w-6" /> : <Music className={cn("h-6 w-6 transition-transform duration-500", isPlaying && "animate-bounce")} />}
                </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                        onClick={onToggleFavorite}
                        className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center transition-all active:scale-90"
                        title="المفضلة"
                    >
                        <Heart className={cn("h-3.5 w-3.5 text-muted-foreground", isFavorite && "text-primary fill-primary scale-110")} />
                    </button>
                    {item.downloadUrl && (
                        <button 
                            onClick={() => onAction(() => window.open(item.downloadUrl, '_blank'))}
                            className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary border border-primary/5 hover:bg-primary/10 active:scale-90 transition-all"
                            title="تحميل"
                        >
                            <Download className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 px-1">
                    <Slider 
                        value={[currentTime]} 
                        max={duration || 100} 
                        step={0.1}
                        onValueChange={handleSliderChange}
                        className="cursor-pointer py-2"
                        disabled={loadError}
                    />
                </div>
            </div>
        </div>
    );
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const firestore = useFirestore();
  const { showInterstitial, config: adsConfig } = useUnityAds();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<any[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  
  const [interactionCount, setInteractionCount] = useState(0);

  const categoryRef = useMemoFirebase(() => id ? doc(firestore!, 'categories', id) : null, [firestore, id]);
  const { data: category, isLoading: isCategoryLoading } = useDoc<CategoryType>(categoryRef);

  const { subCategories, categoryMap } = useCategories();
  
  const currentSubCategories = useMemo(() => {
      if (!id || !category) return [];
      
      // If we are in Style 7 and it's a subcategory, show its siblings too
      if (category.displayStyle === 'style7' && category.parentId) {
          return subCategories.get(category.parentId) || [];
      }
      
      return subCategories.get(id) || [];
  }, [subCategories, id, category]);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !id) return null;
      return query(collection(firestore, 'categories', id, 'items'), orderBy('order', 'asc'));
  }, [firestore, id]);
  const { data: rawItems, isLoading: areItemsLoading } = useCollection<any>(itemsQuery);

  const isFavorite = (itemId: string) => favorites.some(item => item.id === itemId);

  const toggleFavorite = (item: WithId<any>) => {
    const isCurrentlyFavorite = isFavorite(item.id);
    if (isCurrentlyFavorite) {
      setFavorites(prev => prev.filter(fav => fav.id !== item.id));
      toast({ title: "تمت الإزالة من المفضلة" });
    } else {
      setFavorites(prev => [...prev, { ...item, displayStyle: category?.displayStyle || 'style1' }]);
      toast({ title: "تمت الإضافة إلى المفضلة" });
    }
    incrementInteraction();
  };

  const incrementInteraction = () => {
      const newCount = interactionCount + 1;
      setInteractionCount(newCount);
      const frequency = adsConfig?.interstitialFrequency || 6;
      if (newCount >= frequency) {
          showInterstitial();
          setInteractionCount(0);
      }
  };

  const handleAction = (item: WithId<any>, action: () => void) => {
      const isLocked = item.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
      if (isLocked) {
          setShowUpgradeDialog(true);
      } else {
          action();
          incrementInteraction();
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

  const filteredItems = useMemo(() => {
    if (!rawItems) return [];
    const viewableItems = (isAdmin || isEditor) 
        ? rawItems 
        : rawItems.filter(item => item.status === 'approved' || !item.status);
        
    return viewableItems.filter((item) => (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()));
  }, [rawItems, searchTerm, isAdmin, isEditor]);

  const isMaintenanceOn = category?.isUnderMaintenance && !isAdmin && !isEditor;
  const showSkeleton = (isCategoryLoading || areItemsLoading || isUserLoading) && !isMaintenanceOn && (!rawItems || rawItems.length === 0);

  const renderContent = () => {
    if (isMaintenanceOn) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-card/40 backdrop-blur-3xl rounded-[3rem] mt-8 shadow-2xl border border-white/20 min-h-[550px] relative overflow-hidden group">
            <div className="absolute top-10 left-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                <Cog className="h-32 w-32 animate-gear-rotate text-primary" />
            </div>
            <div className="absolute bottom-10 right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                <Cog className="h-24 w-24 animate-gear-rotate-reverse text-primary" />
            </div>

            <div className="space-y-8 relative z-20">
                <div className="relative inline-block">
                    <div className="bg-primary/10 p-8 rounded-[2.5rem] relative z-10 animate-floating">
                        <Wrench className="h-16 w-16 text-primary animate-wrench" />
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/10 rounded-full blur-md animate-float-shadow" />
                </div>

                <div className="space-y-3">
                    <h3 className="font-black text-2xl text-foreground tracking-tight">نطور من أجلك</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed font-bold opacity-80">
                        فريقنا الفني يعمل الآن كخلية نحل لإضافة لمسات إبداعية لهذا القسم. سنكون جاهزين لاستقبالكم قريباً جداً!
                    </p>
                </div>

                <div className="flex flex-col items-center gap-4 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
                        <Construction className="h-3 w-3" />
                        الوضع: تحت التحسين
                    </div>
                    <Button variant="default" onClick={() => router.back()} className="rounded-2xl h-14 px-10 font-black shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">العودة للرئيسية</Button>
                </div>
            </div>
         </div>
       )
    }

    if (!showSkeleton && filteredItems.length === 0 && currentSubCategories.length === 0) return (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-[2.5rem] mt-4 shadow-sm border border-dashed">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-black">لا يوجد محتوى متاح حالياً.</p>
        </div>
    );

    const typedItems = filteredItems as WithId<any>[];
    const displayStyle = category?.displayStyle || 'style1';

    return (
        <div className="space-y-8">
            {currentSubCategories.length > 0 && (
                displayStyle === 'style7' ? (
                    <div className="relative -mx-6">
                        <ScrollArea className="w-full" dir="rtl">
                            <div className="flex gap-3 px-6 pb-2">
                                {currentSubCategories.map((sub) => {
                                    const isActive = sub.id === id;
                                    const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => handleSubCategoryClick(sub)}
                                            className={cn(
                                                "whitespace-nowrap px-6 py-3 rounded-full font-black text-xs transition-all duration-300 border-2",
                                                isActive 
                                                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                                                    : "bg-card text-muted-foreground border-transparent hover:border-primary/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Crown className="h-3 w-3 text-yellow-500" />}
                                                {sub.name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" className="hidden" />
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {currentSubCategories.map((sub, idx) => {
                            const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
                            return (
                                <div key={sub.id} onClick={() => handleSubCategoryClick(sub)} className="animate-in fade-in zoom-in-95 duration-500 fill-mode-both" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="relative bg-primary text-primary-foreground p-4 rounded-[2.2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 aspect-square text-center active:scale-95 group overflow-hidden border-4 border-white/5">
                                        <div className="absolute -bottom-4 -right-4 bg-white/10 w-16 h-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
                                        
                                        {isLocked && <Crown className="absolute top-4 left-4 h-5 w-5 text-yellow-300 drop-shadow-md z-20" />}
                                        
                                        {sub.fileTypes && (
                                            <div className="absolute top-4 right-4 bg-black/20 text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase backdrop-blur-sm z-20">
                                                {sub.fileTypes}
                                            </div>
                                        )}

                                        <p className="font-bold text-sm relative z-10 leading-snug px-2 group-hover:scale-105 transition-transform duration-300">{sub.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {typedItems.length > 0 && (
                <div className="space-y-10">
                    {displayStyle === 'style7' ? (
                        <div className="space-y-5">
                            {typedItems.map(item => (
                                <AudioPlayerRow key={item.id} item={item} isFavorite={isFavorite(item.id)} onToggleFavorite={() => toggleFavorite(item)} onAction={(action) => handleAction(item, action)} activeId={activeAudioId} onPlay={setActiveAudioId} />
                            ))}
                        </div>
                    ) : displayStyle === 'style3' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                                    <h3 className="font-black text-sm text-center text-primary px-4">{item.title}</h3>
                                    <div className="relative w-full rounded-[2.5rem] overflow-hidden bg-muted group shadow-2xl border-4 border-white/5 cursor-zoom-in" onClick={() => { if (item.imageUrl) setSelectedImage(item.imageUrl); incrementInteraction(); }}>
                                        {item.imageUrl && <img src={item.imageUrl} alt="" className="block w-full h-auto object-contain" />}
                                        <button className="absolute top-4 left-4 z-10 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all hover:bg-primary active:scale-90" onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}>
                                            <Heart className={cn("h-5 w-5 text-white transition-all", isFavorite(item.id) && "fill-white text-white scale-110")} />
                                        </button>
                                    </div>
                                    <div className="space-y-2 px-2">
                                        <Textarea readOnly value={item.prompt || ''} className="h-28 bg-muted/50 border-none rounded-2xl text-xs font-mono p-4" dir="ltr" />
                                    </div>
                                    <div className="flex gap-3 px-2">
                                        <Button className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-sm" onClick={() => handleAction(item, () => { if(item.prompt) { navigator.clipboard.writeText(item.prompt); toast({title:"تم النسخ بنجاح"}); } })}>نسخ البرومبت</Button>
                                        {item.downloadUrl && <Button variant="outline" className="h-14 w-14 rounded-2xl border-2 border-primary/20" onClick={() => handleAction(item, () => window.open(item.downloadUrl, '_blank'))}><Download className="h-6 w-6 text-primary" /></Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayStyle === 'style4' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="font-black text-sm text-center truncate px-2">{item.title}</h3>
                                    <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                                        {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                                            <div className="bg-primary/90 text-white p-4 rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-all">
                                                <PlayCircle className="h-10 w-10" />
                                            </div>
                                        </div>
                                        <button className="absolute top-4 left-4 z-10 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all" onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}>
                                            <Heart className={cn("h-5 w-5 text-white transition-all", isFavorite(item.id) && "fill-white scale-110")} />
                                        </button>
                                    </div>
                                    <Button className="w-full rounded-[1.5rem] h-14 font-black shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}><PlayCircle className="ml-2 h-5 w-5" /> مشاهدة الآن</Button>
                                </div>
                            ))}
                        </div>
                    ) : displayStyle === 'style5' ? (
                        <div className="space-y-10">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[3rem] border-none bg-primary/5 backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-6 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="h-20 w-24 rounded-[1.8rem] bg-card relative overflow-hidden shrink-0 shadow-lg border-2 border-primary/5">
                                                {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover h-full w-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <h3 className="text-lg font-black leading-tight truncate">{item.title}</h3>
                                                {item.appVersion && <span className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">v{item.appVersion}</span>}
                                            </div>
                                            <button onClick={() => toggleFavorite(item)} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground transition-all">
                                                <Heart className={cn("h-5 w-5", isFavorite(item.id) && "text-primary fill-primary")} />
                                            </button>
                                        </div>
                                        {item.screenshots && item.screenshots.length > 0 && (
                                            <div className="relative -mx-6 overflow-hidden">
                                                <ScrollArea className="w-full" dir="rtl">
                                                    <div className="flex gap-3 px-6 pb-2">
                                                        {item.screenshots.map((shot, idx) => (
                                                            <div key={idx} className="relative h-48 w-28 rounded-2xl overflow-hidden bg-muted shrink-0 shadow-md cursor-zoom-in" onClick={() => setSelectedImage(shot)}>
                                                                <img src={shot} alt="" className="object-cover h-full w-full" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" className="hidden" />
                                                </ScrollArea>
                                            </div>
                                        )}
                                        <Button className="w-full h-14 rounded-[1.8rem] font-black shadow-lg" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}><Download className="ml-2 h-5 w-5" /> تحميل التطبيق</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : displayStyle === 'style2' ? (
                        <div className="space-y-10">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="font-black text-base text-center px-4 leading-tight">{item.title}</h3>
                                    <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-zoom-in" onClick={() => { if (item.imageUrl) setSelectedImage(item.imageUrl); incrementInteraction(); }}>
                                        {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="block w-full h-auto object-contain" />}
                                        <button className="absolute top-4 left-4 z-10 h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all" onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}>
                                            <Heart className={cn("h-5 w-5 text-white", isFavorite(item.id) && "fill-white scale-110")} />
                                        </button>
                                    </div>
                                    <Button className="w-full rounded-[1.8rem] h-16 font-black shadow-xl text-lg" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}><Download className="ml-2 h-6 w-6" /> تحميل الآن</Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                            {typedItems.map(item => (
                                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                                    <h3 className="font-black text-sm text-center truncate px-2">{item.title}</h3>
                                    <div className="relative aspect-square w-full rounded-[2.2rem] overflow-hidden shadow-xl group cursor-zoom-in" onClick={() => { if (item.imageUrl) setSelectedImage(item.imageUrl); incrementInteraction(); }}>
                                        {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />}
                                        <button className="absolute top-3 left-3 z-10 h-8 w-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all" onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}>
                                            <Heart className={cn("h-4 w-4 text-white transition-all", isFavorite(item.id) && "fill-white scale-110")} />
                                        </button>
                                        {item.isNew && <div className="absolute top-3 right-3 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10">جديد</div>}
                                    </div>
                                    <Button className="w-full rounded-[1.5rem] h-14 font-black shadow-xl text-xs" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}><Download className="ml-2 h-4 w-4" /> تحميل</Button>
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
        <Header showMenu={false} title={showSkeleton ? '...' : (category?.name || "تحميل...")}>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
        </Header>
        <div className="relative z-10 -mt-12 px-6">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="ابحث في هذا القسم..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-sm shadow-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </div>
      <main className="flex-1 px-6 pt-8 pb-24">
        {showSkeleton ? (
          <div className="grid grid-cols-2 gap-4">
             {[...Array(4)].map((_, i) => <CategorySkeleton key={i} className="aspect-square" />)}
          </div>
        ) : renderContent()}
      </main>
      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none overflow-hidden rounded-3xl">
          <button className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 p-3 rounded-full z-50 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
            <X className="h-6 w-6" />
          </button>
          {selectedImage && <div className="relative w-full h-[85vh]"><img src={selectedImage} alt="" className="w-full h-full object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
