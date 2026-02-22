'use client';
import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem } from '@/lib/definitions';
import { ArrowLeft, Download, Search, Heart, Crown, Hammer, ExternalLink, PlayCircle, X, Music, Play, Pause, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import { AffiliateAdSlot, useAffiliateAds } from '@/components/ads/AffiliateAdsManager';

const FavoriteButton = ({ isFavorite, onClick, className }: { isFavorite: boolean, onClick: (e: any) => void, className?: string }) => (
    <button 
        className={cn(
            "absolute top-4 left-4 h-10 w-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-20 border border-black/5",
            className
        )} 
        onClick={onClick}
    >
        <Heart className={cn("h-5 w-5 transition-colors", isFavorite ? "fill-primary text-primary" : "text-gray-500")} />
    </button>
);

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
            "flex flex-col gap-3 p-4 bg-card/40 backdrop-blur-xl rounded-[2rem] border border-primary/10 shadow-lg group animate-in fade-in slide-in-from-bottom-2 duration-500",
            loadError && "border-destructive/30 bg-destructive/5"
        )}>
            <audio ref={audioRef} src={directAudioUrl || undefined} preload="metadata" referrerPolicy="no-referrer" />
            <div className="flex items-center gap-4">
                <button onClick={togglePlay} disabled={loadError} className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-90 transition-all">
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 ml-1 fill-current" />}
                </button>
                <div className="flex-1 min-w-0 text-center">
                    <p className="font-black text-sm truncate leading-tight">{item.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '--:--'}
                    </p>
                </div>
                <div className="h-12 w-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {loadError ? <button onClick={() => audioRef.current?.load()}><RefreshCw className="h-5 w-5" /></button> : <Music className={cn("h-6 w-6", isPlaying && "animate-bounce")} />}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                    <button onClick={onToggleFavorite} className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center border active:scale-90 transition-transform">
                        <Heart className={cn("h-4 w-4 transition-colors", isFavorite ? "text-primary fill-primary" : "text-gray-400")} />
                    </button>
                    {item.downloadUrl && <button onClick={() => onAction(() => window.open(item.downloadUrl, '_blank'))} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary"><Download className="h-3.5 w-3.5" /></button>}
                </div>
                <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={(v) => { if(audioRef.current) audioRef.current.currentTime = v[0]; }} className="flex-1" />
            </div>
        </div>
    );
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const firestore = useFirestore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<any[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const { adFrequency } = useAffiliateAds();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const categoryRef = useMemoFirebase(() => id ? doc(firestore!, 'categories', id) : null, [firestore, id]);
  const { data: category, isLoading: isCategoryLoading } = useDoc<CategoryType>(categoryRef);
  const { subCategories } = useCategories();
  
  const currentSubCategories = useMemo(() => {
      if (!id || !category) return [];
      if (category.displayStyle === 'style7' && category.parentId) return subCategories.get(category.parentId) || [];
      return subCategories.get(id) || [];
  }, [subCategories, id, category]);

  const itemsQuery = useMemoFirebase(() => id ? query(collection(firestore!, 'categories', id, 'items'), orderBy('order', 'asc')) : null, [firestore, id]);
  const { data: rawItems, isLoading: areItemsLoading } = useCollection<any>(itemsQuery);

  const toggleFavorite = (item: WithId<any>) => {
    const isFavorite = favorites.some(f => f.id === item.id);
    if (isFavorite) setFavorites(prev => prev.filter(f => f.id !== item.id));
    else setFavorites(prev => [...prev, { ...item, displayStyle: category?.displayStyle || 'style1' }]);
    toast({ title: isFavorite ? "تمت الإزالة" : "تمت الإضافة للمفضلة" });
  };

  const handleAction = (item: WithId<any>, action: () => void) => {
      if (item.visibility === 'pro' && !isPro && !isAdmin && !isEditor) setShowUpgradeDialog(true);
      else action();
  };

  const filteredItems = useMemo(() => {
    if (!rawItems) return [];
    const viewable = (isAdmin || isEditor) ? rawItems : rawItems.filter(i => i.status === 'approved' || !i.status);
    return viewable.filter(i => (i.title || "").toLowerCase().includes(searchTerm.toLowerCase()));
  }, [rawItems, searchTerm, isAdmin, isEditor]);

  const isMaintenanceOn = category?.isUnderMaintenance && !isAdmin && !isEditor;
  const showSkeleton = (isCategoryLoading || areItemsLoading || isUserLoading) && !isMaintenanceOn && (!rawItems || rawItems.length === 0);

  const renderItem = (item: any) => {
    const style = category?.displayStyle || 'style1';
    const isFav = favorites.some(f => f.id === item.id);

    switch(style) {
        case 'style3':
            return (
                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-black text-sm text-center text-primary">{item.title}</h3>
                    <div className="relative w-full rounded-[2.5rem] overflow-hidden bg-muted shadow-2xl border-4 border-white/5" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-auto" />}
                        <FavoriteButton isFavorite={isFav} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} />
                    </div>
                    <Textarea readOnly value={item.prompt || ''} className="h-28 bg-muted/50 rounded-2xl text-xs font-mono p-4 shadow-inner" dir="ltr" />
                    <div className="flex gap-3">
                        <Button className="flex-1 h-14 rounded-2xl font-black shadow-xl" onClick={() => handleAction(item, () => { navigator.clipboard.writeText(item.prompt || ''); toast({title:"تم النسخ"}); })}>نسخ البرومبت</Button>
                        {item.downloadUrl && <Button variant="outline" className="h-14 w-14 rounded-2xl border-2" onClick={() => handleAction(item, () => window.open(item.downloadUrl, '_blank'))}><Download className="h-6 w-6 text-primary" /></Button>}
                    </div>
                </div>
            );
        case 'style4':
            return (
                <div key={item.id} className="flex flex-col gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-black text-sm text-center">{item.title}</h3>
                    <div className="relative aspect-video bg-black overflow-hidden rounded-[2.5rem] shadow-2xl cursor-pointer" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover w-full h-full opacity-80" />}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-primary/90 text-white p-4 rounded-full shadow-2xl backdrop-blur-sm scale-90 active:scale-110 transition-transform"><PlayCircle className="h-12 w-12" /></div>
                        </div>
                        <FavoriteButton isFavorite={isFav} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} />
                    </div>
                </div>
            );
        case 'style5':
            return (
                <Card key={item.id} className="overflow-hidden rounded-[2.5rem] border border-white/20 bg-primary/5 backdrop-blur-3xl shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="h-16 w-16 rounded-[1.2rem] bg-card relative overflow-hidden shrink-0 shadow-2xl border-2 border-white/10">
                                {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover w-full h-full" />}
                            </div>
                            <div className="flex-1 pt-1">
                                <h3 className="text-lg font-black leading-tight truncate">{item.title}</h3>
                                {item.appVersion && <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">إصدار {item.appVersion}</span>}
                            </div>
                            <button 
                                onClick={() => toggleFavorite(item)} 
                                className="h-10 w-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform border border-black/5"
                            >
                                <Heart className={cn("h-5 w-5 transition-colors", isFav ? "fill-primary text-primary" : "text-gray-400")} />
                            </button>
                        </div>
                        {item.screenshots && item.screenshots.length > 0 && (
                            <div className="mb-6 -mx-2">
                                <ScrollArea className="w-full" dir="rtl">
                                    <div className="flex gap-3 px-2 pb-2">
                                        {item.screenshots.map((shot: string, idx: number) => (
                                            <div key={idx} className="relative h-[180px] w-[100px] rounded-[1.2rem] overflow-hidden bg-muted shrink-0 shadow-lg cursor-zoom-in" onClick={() => setSelectedImage(shot)}>
                                                <img src={shot} alt="" className="object-cover w-full h-full" />
                                            </div>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" className="hidden" />
                                </ScrollArea>
                            </div>
                        )}
                        <Button className="w-full h-14 rounded-2xl font-black shadow-lg" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}><Download className="ml-2 h-5 w-5" /> تحميل الآن</Button>
                    </div>
                </Card>
            );
        case 'style6':
            return (
                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-black text-sm text-center">{item.title}</h3>
                    <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer border-4 border-white/5" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover w-full h-full" />}
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink className="text-white h-10 w-10" /></div>
                        <FavoriteButton isFavorite={isFav} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} />
                    </div>
                    <Button className="w-full rounded-2xl font-black h-14 shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>زيارة الموقع الآن</Button>
                </div>
            );
        case 'style2':
            return (
                <div key={item.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-black text-sm text-center">{item.title}</h3>
                    <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl cursor-zoom-in" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-auto" />}
                        <FavoriteButton isFavorite={isFav} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} />
                    </div>
                    <Button className="w-full rounded-2xl font-black h-14 shadow-xl" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}><Download className="ml-2 h-5 w-5" /> تحميل الآن</Button>
                </div>
            );
        default:
            return (
                <div key={item.id} className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-black text-xs text-center truncate px-1">{item.title}</h3>
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-xl border-4 border-white/5" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                        <FavoriteButton isFavorite={isFav} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} className="top-3 left-3 h-8 w-8" />
                    </div>
                    <Button className="w-full h-12 rounded-[1.2rem] font-black text-xs" onClick={() => handleAction(item, () => window.open(item.downloadUrl, '_blank'))}><Download className="ml-1 h-3.5 w-3.5" /> تحميل</Button>
                </div>
            );
    }
  };

  const renderContent = () => {
    if (isMaintenanceOn) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-in fade-in zoom-in duration-700">
            <Card className="w-full max-w-md overflow-hidden rounded-[3rem] border-none shadow-2xl bg-card">
                <div className="relative aspect-[4/3] w-full bg-muted">
                    <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800&auto=format&fit=crop" alt="Maintenance" className="object-cover w-full h-full opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>
                <div className="px-8 pb-10 -mt-12 relative z-10 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-md">
                        <Settings className="h-3.5 w-3.5 animate-spin" /> تحسينات مستمرة
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-foreground">إبداع قيد التحضير</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed px-2">نحن نقوم الآن بضبط بعض التفاصيل التقنية والجمالية لنقدم لك أفضل نسخة من هذا القسم. انتظرنا!</p>
                    </div>
                    <Button size="lg" onClick={() => router.push('/home')} className="w-full h-16 rounded-[2rem] text-lg font-black bg-primary">العودة للرئيسية</Button>
                </div>
            </Card>
        </div>
    );

    if (!showSkeleton && filteredItems.length === 0 && currentSubCategories.length === 0) return <div className="text-center py-20 text-muted-foreground bg-card rounded-[2.5rem] mt-4 border border-dashed"><Search className="h-16 w-16 mx-auto mb-4 opacity-20" /><p className="text-lg font-black">لا يوجد محتوى حالياً.</p></div>;

    const displayStyle = category?.displayStyle || 'style1';

    return (
        <div className="space-y-8">
            {currentSubCategories.length > 0 && (
                <div className={cn("relative", displayStyle === 'style7' ? "-mx-6" : "")}>
                    <ScrollArea className="w-full" dir="rtl">
                        <div className={cn("flex gap-3 px-6 pb-2", displayStyle !== 'style7' && "grid grid-cols-2 px-0")}>
                            {currentSubCategories.map((sub) => {
                                const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
                                const isActive = sub.id === id;
                                return (
                                    <div key={sub.id} onClick={() => !isLocked ? router.push(`/categories/${sub.id}`) : setShowUpgradeDialog(true)} className={cn(
                                        "cursor-pointer transition-all",
                                        displayStyle === 'style7' ? "whitespace-nowrap px-6 py-3 rounded-full font-black text-xs border-2 " + (isActive ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-card text-muted-foreground border-transparent shadow-sm") : 
                                        "relative bg-primary text-primary-foreground p-4 rounded-[2.2rem] flex flex-col items-center justify-center aspect-square text-center overflow-hidden border-4 border-white/5 shadow-lg active:scale-95"
                                    )}>
                                        {displayStyle !== 'style7' && sub.fileTypes && (
                                            <div className="absolute top-4 right-4 bg-black/20 text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase z-20">
                                                {sub.fileTypes}
                                            </div>
                                        )}
                                        {isLocked && <Crown className={cn("h-4 w-4 text-yellow-400", displayStyle === 'style7' ? "ml-2 inline" : "absolute top-4 left-4")} />}
                                        <p className={cn("font-black", displayStyle === 'style7' ? "text-xs" : "text-sm relative z-10 leading-snug")}>{sub.name}</p>
                                    </div>
                                );
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>
                </div>
            )}

            <div className="space-y-8">
                {displayStyle === 'style7' ? (
                    <div className="space-y-5">
                        {filteredItems.map((item, idx) => (
                            <Fragment key={item.id}>
                                <AudioPlayerRow item={item} isFavorite={favorites.some(f => f.id === item.id)} onToggleFavorite={() => toggleFavorite(item)} onAction={(a) => handleAction(item, a)} activeId={activeAudioId} onPlay={setActiveAudioId} />
                                {(idx + 1) % adFrequency === 0 && <AffiliateAdSlot placement="inline" categoryId={id} className="rounded-2xl overflow-hidden shadow-sm" />}
                            </Fragment>
                        ))}
                    </div>
                ) : (
                    <div className={cn("grid gap-6", (displayStyle === 'style1' || displayStyle === 'style2') ? (displayStyle === 'style1' ? "grid-cols-2" : "grid-cols-1") : "grid-cols-1")}>
                        {filteredItems.map((item, idx) => (
                            <Fragment key={item.id}>
                                {renderItem(item)}
                                {(idx + 1) % adFrequency === 0 && <div className={displayStyle === 'style1' ? "col-span-2" : ""}><AffiliateAdSlot placement="inline" categoryId={id} className="rounded-3xl overflow-hidden shadow-md" /></div>}
                            </Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
  };
  
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <Header title={showSkeleton ? '...' : (category?.name || "تحميل...")}>
            <Button variant="ghost" size="icon" className="text-primary-foreground rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
        </Header>
        <div className="relative z-10 -mt-12 px-6">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="ابحث في هذا القسم..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-sm shadow-2xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </div>
      <main className="flex-1 px-6 pt-8 pb-24">{showSkeleton ? <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <CategorySkeleton key={i} className="aspect-square" />)}</div> : renderContent()}</main>
      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none overflow-hidden rounded-3xl">
          <DialogTitle className="sr-only">معاينة الصورة</DialogTitle>
          <button className="absolute top-4 right-4 text-white bg-black/50 p-3 rounded-full z-50 backdrop-blur-md" onClick={() => setSelectedImage(null)}><X className="h-6 w-6" /></button>
          {selectedImage && <div className="relative w-full h-[85vh] flex items-center justify-center"><img src={selectedImage} alt="" className="max-w-full max-h-full object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
