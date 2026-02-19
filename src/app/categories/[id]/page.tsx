'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, increment } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem, ReferralConfig } from '@/lib/definitions';
import { ArrowLeft, Download, Copy, Search, Heart, AlertTriangle, Crown, Lock, Settings2, Coins, Cpu, Hammer, ExternalLink, Sparkles, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import UpgradeProDialog from '@/components/dialogs/UpgradeProDialog';
import { useCategories } from '@/components/providers/CategoryProvider';
import { Badge } from '@/components/ui/badge';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const firestore = useFirestore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, isEditor, userProfile, user, isLoading: isUserLoading } = useUserProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<{item: WithId<ContentItem>, cost: number} | null>(null);

  const { categoryMap, subCategories, isLoadingCategories: areAllCategoriesLoading } = useCategories();
  const category = useMemo(() => id ? categoryMap.get(id) : null, [categoryMap, id]);
  const currentSubCategories = useMemo(() => id ? subCategories.get(id) || [] : [], [subCategories, id]);

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

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
        : rawItems.filter(item => 
            !item.status || 
            item.status === 'approved' || 
            item.status === ''
          );
        
    const searchedItems = viewableItems.filter((item) => 
        (item.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...searchedItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawItems, searchTerm, isAdmin, isEditor]);

  const handleAction = (item: WithId<ContentItem>, action: () => void) => {
      const isLocked = item.visibility === 'pro' && !isPro && !isAdmin;
      if (isLocked) {
          const cost = refConfig?.pointsPerUnlock || 5;
          if (userProfile && (userProfile.points ?? 0) >= cost) {
              setShowUnlockDialog({ item, cost });
          } else {
              setShowUpgradeDialog(true);
          }
      } else {
          action();
      }
  };

  const confirmUnlock = () => {
      if (!showUnlockDialog || !user || !firestore) return;
      const { cost } = showUnlockDialog;
      updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          points: increment(-cost)
      });
      toast({ title: "تم فتح المحتوى بنجاح!" });
      setShowUnlockDialog(null);
  };

  const handleSubCategoryClick = (sub: WithId<CategoryType>) => {
      const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin;
      if (isLocked) {
          setShowUpgradeDialog(true);
      } else {
          router.push(`/categories/${sub.id}`);
      }
  };

  const isLoading = areAllCategoriesLoading || areItemsLoading || isUserLoading;

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
            <p className="text-sm mt-2 opacity-60">تأكد من اختيار القسم الصحيح أو العودة لاحقاً.</p>
        </div>
    );

    const typedItems = filteredItems as WithId<ContentItem>[];

    return (
        <div className="space-y-10">
            {/* Sub-categories Navigation - Fixed Design */}
            {currentSubCategories.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1 opacity-60">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        <h4 className="text-xs font-black uppercase tracking-widest">أقسام فرعية</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {currentSubCategories.map(sub => {
                            const isLocked = sub.visibility === 'pro' && !isPro && !isAdmin;
                            return (
                                <div key={sub.id} onClick={() => handleSubCategoryClick(sub)}>
                                    <div className="relative bg-primary text-primary-foreground p-4 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-all shadow-sm aspect-square text-center active:scale-95 group overflow-hidden">
                                        <div className="absolute -bottom-4 -right-4 bg-white/10 w-16 h-16 rounded-full group-hover:scale-150 transition-transform duration-500" />
                                        {isLocked && <Crown className="absolute top-3 left-3 h-5 w-5 text-yellow-300 drop-shadow-md" />}
                                        {sub.fileTypes && <div className="absolute top-3.5 right-3.5 bg-black/20 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase backdrop-blur-sm">{sub.fileTypes}</div>}
                                        <p className="font-bold text-lg relative z-10 leading-snug">{sub.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content Display based on Style */}
            {typedItems.length > 0 && (
                <div className="space-y-6">
                    {category?.displayStyle === 'style3' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden bg-card border-none shadow-md rounded-3xl relative">
                                    <CardContent className="p-4 space-y-4">
                                        <h3 className="font-bold text-lg text-center">{item.title}</h3>
                                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
                                            {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                                            <button className="absolute top-2 left-2 z-10 h-8 w-8 bg-black/50 rounded-full flex items-center justify-center" onClick={() => toggleFavorite(item)}>
                                                <Heart className={cn("h-4 w-4 text-white", isFavorite(item.id) && "fill-white")} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black opacity-50">البرومبت:</p>
                                            <Textarea readOnly value={item.prompt || ''} className="h-24 bg-muted/50 border-none rounded-xl text-xs" dir="ltr" />
                                        </div>
                                        <Button className="w-full h-12 rounded-xl font-black" onClick={() => handleAction(item, () => { if(item.prompt) { navigator.clipboard.writeText(item.prompt); toast({title:"تم النسخ"}); } })}>
                                            <Copy className="ml-2 h-4 w-4" /> نسخ البرومبت
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : category?.displayStyle === 'style6' ? (
                        <div className="grid grid-cols-1 gap-6">
                            {typedItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[2rem] border-none shadow-lg bg-card">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="md:w-1/3 aspect-video md:aspect-auto relative bg-muted">
                                            {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col justify-center space-y-3">
                                            <h3 className="text-xl font-black">{item.title}</h3>
                                            <p className="text-muted-foreground text-xs line-clamp-2">{item.instructions || 'تفضل بزيارة هذا الموقع للحصول على المزيد من المعلومات والإلهام لمشاريعك.'}</p>
                                            <Button className="w-fit rounded-xl font-black px-6" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                                                <ExternalLink className="ml-2 h-4 w-4" /> زيارة الموقع
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {typedItems.map(item => (
                                <div key={item.id} className="space-y-3 text-center">
                                    <div className="relative aspect-square rounded-3xl overflow-hidden shadow-md bg-muted" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                                        {item.imageUrl && <Image src={item.imageUrl} alt="" fill className="object-cover" />}
                                        {item.isNew && <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">جديد</div>}
                                    </div>
                                    <h3 className="font-bold text-sm truncate">{item.title}</h3>
                                    <Button size="sm" className="w-full rounded-xl h-10 font-black" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                                        <Download className="ml-2 h-4 w-4" /> تحميل
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
        <div className="sticky top-0 z-20">
             <Header showMenu={false} title={areAllCategoriesLoading ? '...' : (category?.name || "تحميل...")}>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
             </Header>
            <div className="relative z-10 -mt-12">
              <div className="pb-4 px-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="ابحث..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-lg shadow-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
        </div>

      <main className="flex-1 px-6 pt-2 pb-24">
        {!isLoading && !category ? (
            <div className="text-center text-destructive p-12 bg-destructive/10 rounded-[2.5rem] mt-4 space-y-4">
                <AlertTriangle className="mx-auto h-12 w-12" />
                <h3 className="font-black text-xl">عفواً، لم نجد هذا القسم</h3>
                <Button variant="outline" onClick={() => router.push('/home')} className="rounded-xl border-2">العودة للرئيسية</Button>
            </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4 mt-6">
             {[...Array(4)].map((_, i) => <CategorySkeleton key={i} className="aspect-square" />)}
          </div>
        ) : renderContent()}
      </main>

      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
      
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only"><DialogTitle>Preview</DialogTitle></DialogHeader>
          {selectedImage && <div className="relative w-full h-[80vh]"><Image src={selectedImage} alt="" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
