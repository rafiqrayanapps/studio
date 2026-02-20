'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem } from '@/lib/definitions';
import { ArrowLeft, Download, Copy, Search, Heart, AlertTriangle, Crown, Lock, Hammer, ExternalLink, LayoutGrid, PlayCircle, Eye, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const firestore = useFirestore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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
      toast({ title: "تمت الإزالة من المفضلة" });
      setFavorites(prev => prev.filter(fav => fav.id !== item.id));
    } else {
      toast({ title: "تمت الإضافة إلى المفضلة" });
      setFavorites(prev => [...prev, item]);
    }
  };

  const filteredItems = useMemo(() => {
    if (!rawItems) return [];
    
    const viewableItems = (isAdmin || isEditor)
        ? rawItems 
        : rawItems.filter(item => !item.status || item.status === 'approved');
        
    const searchedItems = viewableItems.filter((item) => 
        (item.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

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

  const isLoading = isCategoryLoading || areItemsLoading || isUserLoading;

  const renderContent = () => {
    if (category?.isUnderMaintenance && !isAdmin && !isEditor) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-8 bg-card rounded-[3rem] mt-4 shadow-2xl border border-primary/10 min-h-[400px]">
            <div className="bg-primary/10 text-primary p-8 rounded-[2rem] mb-6 animate-pulse">
                <Hammer className="h-16 w-16" />
            </div>
            <h3 className="font-black text-2xl mb-2">القسم قيد الصيانة</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">نعمل على تحسين هذا القسم حالياً، سنعود قريباً!</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-8 rounded-2xl px-8 h-12 font-black border-2">
                <ArrowLeft className="ml-2 h-5 w-5" /> العودة للخلف
            </Button>
         </div>
       )
    }

    if (!isLoading && filteredItems.length === 0 && currentSubCategories.length === 0) return (
        <div className="text-center py-20 text-muted-foreground bg-card rounded-[2.5rem] mt-4 shadow-sm">
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
                    <div className="flex items-center gap-2 px-1 opacity-60">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        <h4 className="text-xs font-black uppercase tracking-widest">أقسام فرعية</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {currentSubCategories.map(sub => {
                            const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin && !isEditor;
                            return (
                                <div key={sub.id} onClick={() => handleSubCategoryClick(sub)}>
                                    <div className="relative bg-primary text-primary-foreground p-4 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-lg aspect-square text-center active:scale-95 group overflow-hidden">
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
                </div>
            )}

            {typedItems.length > 0 && (
                <div className="space-y-6">
                    {displayStyle === 'style3' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden bg-card border-none shadow-xl rounded-[2.5rem] relative">
                                    <CardContent className="p-6 space-y-4">
                                        <h3 className="font-black text-lg text-center text-primary">{item.title}</h3>
                                        <div className="relative aspect-video rounded-3xl overflow-hidden bg-muted group">
                                            {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />}
                                            <button className="absolute top-3 left-3 z-10 h-9 w-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center transition-colors hover:bg-primary" onClick={() => toggleFavorite(item)}>
                                                <Heart className={cn("h-4 w-4 text-white", isFavorite(item.id) && "fill-white")} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">البرومبت:</p>
                                            <Textarea readOnly value={item.prompt || ''} className="h-24 bg-muted/50 border-none rounded-2xl text-xs font-mono" dir="ltr" />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button 
                                                className="flex-1 h-14 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95" 
                                                onClick={() => handleAction(item, () => { if(item.prompt) { navigator.clipboard.writeText(item.prompt); toast({title:"تم النسخ"}); } })}
                                            >
                                                <Copy className="ml-2 h-5 w-5" /> نسخ البرومبت
                                            </Button>
                                            {item.downloadUrl && (
                                                <Button 
                                                    variant="outline" 
                                                    className="h-14 w-14 rounded-2xl border-2 hover:bg-primary/10 transition-all border-primary/20"
                                                    onClick={() => handleAction(item, () => window.open(item.downloadUrl, '_blank'))}
                                                >
                                                    <Download className="h-6 w-6 text-primary" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : displayStyle === 'style4' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-card group">
                                    <div className="p-5 text-center">
                                        <h3 className="font-black text-xl mb-1">{item.title}</h3>
                                        {item.isNew && <span className="text-[10px] text-green-500 font-black animate-pulse">جديد</span>}
                                    </div>
                                    <div className="relative aspect-video bg-black overflow-hidden mx-4 rounded-3xl mb-4">
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-1000" />}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-primary/90 text-white p-5 rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-all duration-500 cursor-pointer" onClick={() => handleAction(item, () => item.videoUrl && window.open(item.videoUrl, '_blank'))}>
                                                <PlayCircle className="h-12 w-12" />
                                            </div>
                                        </div>
                                        {item.visibility === 'pro' && !isPro && !isAdmin && !isEditor && <div className="absolute top-4 left-4 bg-yellow-500 text-white p-1.5 rounded-full shadow-lg"><Lock className="h-4 w-4" /></div>}
                                    </div>
                                    <div className="px-6 pb-6 text-center">
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.instructions || 'شاهد شرح المحتوى بالفيديو.'}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : displayStyle === 'style5' ? (
                        <div className="space-y-10">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[3rem] border-none bg-primary/5">
                                    <div className="p-8">
                                        <div className="flex items-center gap-5 mb-6">
                                            <div className="h-20 w-20 rounded-[1.5rem] bg-muted relative overflow-hidden shrink-0 shadow-inner border-2 border-primary/5">
                                                {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-black leading-snug">{item.title}</h3>
                                                {item.appVersion && (
                                                    <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black">
                                                        إصدار: {item.appVersion}
                                                    </span>
                                                )}
                                            </div>
                                            <button className="h-10 w-10 bg-background/50 rounded-2xl flex items-center justify-center transition-all hover:bg-primary/10 shadow-sm" onClick={() => toggleFavorite(item)}>
                                                <Heart className={cn("h-5 w-5 text-muted-foreground", isFavorite(item.id) && "text-primary fill-primary")} />
                                            </button>
                                        </div>

                                        {item.instructions && (
                                            <div className="mb-8">
                                                <div className="p-5 rounded-3xl bg-background/40 border border-primary/5 backdrop-blur-sm">
                                                    <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                                                        {item.instructions}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {item.screenshots && item.screenshots.length > 0 && (
                                            <div className="mb-10 -mx-2">
                                                <div className="overflow-x-auto no-scrollbar pb-2">
                                                    <div className="flex gap-5 px-2">
                                                        {item.screenshots.map((shot, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                className="relative h-[380px] w-[210px] rounded-[2rem] overflow-hidden bg-muted shrink-0 shadow-xl cursor-zoom-in group border-4 border-background/20"
                                                                onClick={() => setSelectedImage(shot)}
                                                            >
                                                                <Image src={shot} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <Button 
                                            className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all bg-primary group"
                                            onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}
                                        >
                                            <Download className="ml-3 h-6 w-6 group-hover:translate-y-1 transition-transform" />
                                            تحميل التطبيق الآن
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : displayStyle === 'style2' ? (
                        <div className="grid grid-cols-1 gap-8">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[2.5rem] border-none shadow-xl bg-card">
                                    <div className="p-6 text-center">
                                        <h3 className="font-black text-xl">{item.title}</h3>
                                        {item.isNew && <span className="text-[10px] text-green-500 font-black">جديد</span>}
                                    </div>
                                    <div className="relative aspect-video bg-muted mx-6 rounded-[2rem] overflow-hidden group shadow-inner">
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                                            <Eye className="text-white h-10 w-10 scale-75 group-hover:scale-100 transition-transform" />
                                        </div>
                                    </div>
                                    <div className="p-6 pt-4">
                                        <Button 
                                            className="w-full rounded-[1.5rem] font-black h-14 shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all" 
                                            onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}
                                        >
                                            <Download className="ml-2 h-5 w-5" /> تحميل الملف
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6">
                            {typedItems.map(item => (
                                <div key={item.id} className="space-y-4 text-center group">
                                    <h3 className="font-black text-sm truncate px-2">{item.title}</h3>
                                    <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-xl bg-muted border-4 border-white dark:border-card" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />}
                                        {item.isNew && <div className="absolute top-3 right-3 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10">جديد</div>}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                            <Eye className="text-white h-8 w-8" />
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full rounded-2xl h-12 font-black shadow-lg shadow-primary/10 hover:scale-[1.05] active:scale-90 transition-all relative overflow-hidden" 
                                        onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}
                                    >
                                        <Download className="ml-2 h-4 w-4 relative z-10" />
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
    <div className="flex min-h-dvh flex-col bg-secondary">
        <div className="sticky top-0 z-30">
             <Header showMenu={false} title={isLoading ? '...' : (category?.name || "تحميل...")}>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
             </Header>
            <div className="relative z-10 -mt-12">
              <div className="pb-4 px-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input placeholder="ابحث..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-lg shadow-2xl focus:ring-4 focus:ring-primary/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
        </div>

      <main className="flex-1 px-6 pt-4 pb-24">
        {!isLoading && !category ? (
            <div className="text-center text-destructive p-12 bg-destructive/10 rounded-[2.5rem] mt-4 space-y-4">
                <AlertTriangle className="mx-auto h-12 w-12" />
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