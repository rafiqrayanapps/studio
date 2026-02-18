'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, increment } from 'firebase/firestore';
import type { Category, ContentItem, ReferralConfig } from '@/lib/definitions';
import { ArrowLeft, Download, Copy, Search, Heart, AlertTriangle, PlayCircle, Crown, Lock, HardHat, Settings2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const firestore = useFirestore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, userProfile, user, isLoading: isUserLoading } = useUserProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<{item: WithId<ContentItem>, cost: number} | null>(null);

  const { subCategories: allSubCategories, categoryMap, isLoadingCategories: areAllCategoriesLoading } = useCategories();
  const category = useMemo(() => categoryMap.get(id), [categoryMap, id]);

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !id) return null;
      return query(collection(firestore, 'categories', id, 'items'), orderBy('order', 'asc'));
  }, [firestore, id]);
  const { data: items, isLoading: areItemsLoading } = useCollection<ContentItem>(itemsQuery);

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
    if (!items) return [];
    const viewableItems = isAdmin ? items : items.filter(item => item.status === 'approved' || !item.status);
    return viewableItems.filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm, isAdmin]);

  const handleAction = (item: WithId<ContentItem>, action: () => void) => {
      const isLocked = item.visibility === 'pro' && !isPro && !isAdmin;
      
      if (isLocked) {
          const cost = refConfig?.pointsPerUnlock || 5;
          if (userProfile && userProfile.points >= cost) {
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
      const userRef = doc(firestore, 'users', user.uid);
      
      updateDocumentNonBlocking(userRef, {
          points: increment(-cost)
      });

      toast({ title: "تم فتح المحتوى بنجاح! تم خصم النقاط." });
      setShowUnlockDialog(null);
  };

  const isLoading = areAllCategoriesLoading || areItemsLoading || isUserLoading;
  const categoryError = !isLoading && !category;

  const FavoriteButton = ({ item }: { item: WithId<ContentItem> }) => (
     <button 
        className="absolute top-2 left-2 z-10 h-8 w-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(item); }}
    >
        <Heart className={cn("h-4 w-4 text-white", isFavorite(item.id) && "fill-white")} />
    </button>
  );

  const renderContent = () => {
    if (category?.isUnderMaintenance && !isAdmin) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-8 bg-card rounded-[3rem] mt-8 shadow-2xl border border-primary/10 overflow-hidden relative min-h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-64 h-64 bg-primary/5 rounded-full animate-ripple" style={{ animationDelay: '0s' }}></div>
                <div className="absolute w-80 h-80 bg-primary/5 rounded-full animate-ripple" style={{ animationDelay: '0.4s' }}></div>
                <div className="absolute w-96 h-96 bg-primary/5 rounded-full animate-ripple" style={{ animationDelay: '0.8s' }}></div>
            </div>

            <div className="relative z-10 space-y-10">
                <div className="relative inline-block">
                    <div className="relative z-10 bg-primary text-primary-foreground p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                        <Settings2 className="h-20 w-20 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div className="absolute -bottom-6 -right-6 bg-yellow-400 p-4 rounded-2xl shadow-xl border-4 border-card animate-bounce">
                        <HardHat className="h-10 w-10 text-yellow-900" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="font-bold text-4xl text-foreground tracking-tight">نعمل على التحسين</h3>
                    <p className="text-muted-foreground text-xl max-w-sm mx-auto leading-relaxed">
                        عفواً، يخضع هذا القسم لصيانة دورية لضمان أفضل تجربة لك. سنعود قريباً بكل جديد!
                    </p>
                </div>

                <Button variant="outline" onClick={() => router.back()} className="rounded-2xl px-12 h-16 text-lg font-bold border-2 hover:bg-primary hover:text-primary-foreground transition-all shadow-lg active:scale-95">
                    <ArrowLeft className="ml-2 h-6 w-6" /> العودة للخلف
                </Button>
            </div>
        </div>
       )
    }

    if (!filteredItems || filteredItems.length === 0) return (
        <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">لا يوجد محتوى يطابق بحثك حالياً.</p>
        </div>
    );
    const typedItems = filteredItems as WithId<ContentItem>[];

    switch (category?.displayStyle) {
      case 'style1':
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {typedItems.map((item) => {
              const isLocked = item.visibility === 'pro' && !isPro && !isAdmin;
              return (
              <div key={item.id} className="flex flex-col text-center group relative gap-y-3">
                <h3 className="font-bold text-base text-card-foreground min-h-[2.5rem] flex items-center justify-center">{item.title}</h3>
                <div className="relative cursor-pointer aspect-square w-full" onClick={() => !isLocked && item.imageUrl && setSelectedImage(item.imageUrl)}>
                    {isLocked && <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 z-10"><Crown className="h-3 w-3" /> برو</div>}
                    {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover rounded-lg shadow-md" />}
                    <FavoriteButton item={item} />
                </div>
                <div className="w-full mt-auto">
                     <Button className="w-full h-11" onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}>
                        {isLocked ? (userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? <Coins className="ml-2 h-4 w-4" /> : <Lock className="ml-2 h-4 w-4" />) : <Download className="ml-2 h-4 w-4" />}
                        {isLocked ? (userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? 'فتح بالنقاط' : 'ترقية للتحميل') : 'تحميل'}
                    </Button>
                </div>
              </div>
            )})}
          </div>
        );
      case 'style3':
        const Style3Item = ({ item }: { item: WithId<ContentItem> }) => {
            const isLocked = item.visibility === 'pro' && !isPro && !isAdmin;
            const handleCopy = () => {
                if (item.prompt) {
                    navigator.clipboard.writeText(item.prompt);
                    toast({ title: "تم نسخ البرومبت!" });
                }
            };
            return (
                <Card className="overflow-hidden bg-card text-card-foreground flex flex-col h-full group relative border-none shadow-md">
                    <CardContent className="p-4 flex flex-col flex-1 gap-4">
                        <h3 className="font-bold text-xl text-center">{item.title}</h3>
                        <div className="relative cursor-pointer w-full rounded-xl overflow-hidden aspect-video bg-muted">
                            {isLocked && <Crown className="absolute top-2 right-2 h-5 w-5 text-yellow-400 z-10" />}
                            {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" onClick={() => !isLocked && item.imageUrl && setSelectedImage(item.imageUrl)} />}
                            <FavoriteButton item={item} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-foreground">البرومبت</h4>
                            {isLocked ? (
                                <div className="h-28 bg-muted/50 rounded-xl flex flex-col items-center justify-center text-center p-4 gap-2 border border-dashed">
                                    <Lock className="h-6 w-6 text-muted-foreground" />
                                    <p className="text-muted-foreground text-xs">محتوى حصري. {userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? `افتحه بـ ${refConfig?.pointsPerUnlock} نقطة` : 'اشترك في برو للوصول.'}</p>
                                    <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => handleAction(item, handleCopy)}>
                                        {userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? 'فتح الآن' : 'الترقية الآن'}
                                    </Button>
                                </div>
                            ) : (
                                <Textarea readOnly value={item.prompt || ''} className="h-28 bg-muted/50 border-transparent rounded-xl resize-none" dir="ltr" />
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                            <Button variant="default" className="w-full h-12 rounded-xl font-bold" onClick={() => handleAction(item, handleCopy)}>
                                {isLocked ? <Coins className="ml-2 h-4 w-4" /> : <Copy className="ml-2 h-4 w-4" />}
                                {isLocked ? 'فتح بالنقاط' : 'نسخ البرومبت'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            );
        };
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {typedItems.map((item) => (
                <div key={item.id} className="h-full"><Style3Item item={item} /></div>
            ))}
          </div>
        );
      default:
        return <div className="text-center p-12 text-muted-foreground">هذا النمط قيد التطوير...</div>;
    }
  };
  
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <div className="sticky top-0 z-20">
             <Header showMenu={false} title={areAllCategoriesLoading ? '...' : (category?.name || "قسم غير معروف")}>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
             </Header>
            <div className="relative z-10 -mt-10">
              <div className="pb-4 px-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input placeholder="ابحث..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-lg shadow-xl focus-visible:ring-2 focus-visible:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
        </div>

      <main className="flex-1 px-6 pt-2 pb-24">
        {categoryError ? (
            <div className="text-center text-destructive p-12 bg-destructive/10 rounded-2xl mt-4 space-y-2">
                <AlertTriangle className="mx-auto h-8 w-8" /><h3 className="font-bold text-lg">خطأ في تحميل القسم</h3>
            </div>
        ) : isLoading ? (
          <div className="space-y-8 mt-6">
             <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <CategorySkeleton key={i} className="h-36" />)}</div>
          </div>
        ) : (
          <div className="space-y-8 mt-4">
            {renderContent()}
          </div>
        )}
      </main>

       <Dialog open={!!showUnlockDialog} onOpenChange={(open) => !open && setShowUnlockDialog(null)}>
           <DialogContent dir="rtl" className="max-w-sm rounded-[2rem] gap-0 p-0 overflow-hidden">
               <div className="p-6 text-center space-y-4">
                   <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl mx-auto flex items-center justify-center animate-pulse">
                       <Coins className="w-10 h-10" />
                   </div>
                   <DialogHeader className="space-y-2">
                       <DialogTitle className="text-2xl font-bold">فتح محتوى برو</DialogTitle>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                           هل تريد استخدام <strong>{showUnlockDialog?.cost} نقطة</strong> من رصيدك لفتح هذا الملف بشكل دائم؟
                       </p>
                   </DialogHeader>
                   <div className="bg-primary/5 py-2 px-4 rounded-full text-xs font-bold text-primary border border-primary/10 inline-block">
                       رصيدك الحالي: {userProfile?.points || 0} نقطة
                   </div>
               </div>
               <DialogFooter className="flex-row border-t p-0">
                   <Button variant="ghost" className="flex-1 h-14 rounded-none text-muted-foreground" onClick={() => setShowUnlockDialog(null)}>إلغاء</Button>
                   <div className="w-px bg-border h-14" />
                   <Button className="flex-1 h-14 rounded-none font-bold text-lg" onClick={confirmUnlock}>تأكيد الخصم</Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>

      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
}
