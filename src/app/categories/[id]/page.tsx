'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, increment } from 'firebase/firestore';
import type { Category, ContentItem, ReferralConfig } from '@/lib/definitions';
import { ArrowLeft, Download, Copy, Search, Heart, AlertTriangle, Crown, Lock, Settings2, Coins, Cpu, Hammer, ExternalLink, Sparkles } from 'lucide-react';
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
  const id = params.id as string;
  const firestore = useFirestore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const { toast } = useToast();
  const { isPro, isAdmin, userProfile, user, isLoading: isUserLoading } = useUserProfile();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<{item: WithId<ContentItem>, cost: number} | null>(null);

  const { categoryMap, isLoadingCategories: areAllCategoriesLoading } = useCategories();
  const category = useMemo(() => categoryMap.get(id), [categoryMap, id]);

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !id) return null;
      return query(collection(firestore, 'categories', id, 'items'), orderBy('order', 'asc'));
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
    const viewableItems = isAdmin 
        ? rawItems 
        : rawItems.filter(item => item.status === 'approved' || item.status === undefined);
        
    return viewableItems.filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [rawItems, searchTerm, isAdmin]);

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

  const NewBadge = () => (
      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg z-20 flex items-center gap-1 animate-pulse">
          <Sparkles className="h-3 w-3" />
          <span>جديد</span>
      </div>
  );

  const renderContent = () => {
    if (category?.isUnderMaintenance && !isAdmin) {
       return (
         <div className="flex flex-col items-center justify-center text-center p-8 bg-card rounded-[3rem] mt-4 shadow-2xl border border-primary/10 overflow-hidden relative min-h-[500px]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute w-2 h-2 bg-primary rounded-full animate-pulse"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 space-y-10 w-full max-w-sm">
                <div className="relative inline-block mx-auto">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full animate-pulse duration-3000" />
                    
                    <div className="relative z-10 bg-primary/90 text-primary-foreground p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(var(--primary),0.3)] backdrop-blur-md border border-white/20">
                        <Cpu className="h-16 w-16 animate-pulse" />
                        <div className="absolute top-0 left-4 right-4 h-[2px] bg-white/60 shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                    </div>

                    <div className="absolute -top-4 -right-4 bg-background p-3 rounded-2xl shadow-xl border border-border animate-bounce">
                        <Hammer className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute -bottom-2 -left-6 bg-background p-2.5 rounded-xl shadow-lg border border-border animate-pulse" style={{ animationDelay: '0.7s' }}>
                        <Settings2 className="h-5 w-5 text-muted-foreground animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="font-black text-3xl text-foreground tracking-tight">القسم حالياً قيد الصيانة</h3>
                        <div className="h-1 w-20 bg-primary/20 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-primary w-1/2 animate-[shimmer_1.5s_infinite]" />
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed font-medium px-4">
                        نحن نقوم الآن بضبط بعض اللمسات الفنية لضمان حصولك على تجربة مستخدم مثالية. سنعود إليكم خلال دقائق!
                    </p>
                </div>

                <div className="pt-2">
                    <Button variant="outline" onClick={() => router.back()} className="group rounded-2xl px-12 h-14 text-base font-black border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-xl active:scale-95">
                        <ArrowLeft className="ml-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" /> العودة للخلف
                    </Button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
       )
    }

    if (!filteredItems || filteredItems.length === 0) return (
        <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold">لا يوجد محتوى يطابق بحثك حالياً.</p>
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
                    {item.isNew && <NewBadge />}
                    {isLocked && <div className={cn("absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 z-10", item.isNew && "top-8")}><Crown className="h-3 w-3" /> برو</div>}
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
                            {item.isNew && <NewBadge />}
                            {isLocked && <Crown className={cn("absolute top-2 right-2 h-5 w-5 text-yellow-400 z-10", item.isNew && "top-8")} />}
                            {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" onClick={() => !isLocked && item.imageUrl && setSelectedImage(item.imageUrl)} />}
                            <FavoriteButton item={item} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-foreground">البرومبت</h4>
                            {isLocked ? (
                                <div className="h-28 bg-muted/50 rounded-xl flex flex-col items-center justify-center text-center p-4 gap-2 border border-dashed">
                                    <Lock className="h-6 w-6 text-muted-foreground" />
                                    <p className="text-muted-foreground text-xs font-bold">محتوى حصري. {userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? `افتحه بـ ${refConfig?.pointsPerUnlock} نقطة` : 'اشترك في برو للوصول.'}</p>
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
      case 'style6':
        return (
          <div className="grid grid-cols-1 gap-8">
            {typedItems.map((item) => {
              const isLocked = item.visibility === 'pro' && !isPro && !isAdmin;
              return (
                <Card key={item.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] border-none bg-card shadow-lg relative">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Thumbnail */}
                    <div className="md:col-span-5 relative aspect-[16/10] overflow-hidden bg-muted group-hover:scale-105 transition-transform duration-700">
                        {item.isNew && <NewBadge />}
                        {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />}
                        {isLocked && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"><Lock className="h-10 w-10 text-white opacity-50" /></div>}
                        <FavoriteButton item={item} />
                    </div>
                    {/* Content */}
                    <div className="md:col-span-7 p-8 flex flex-col justify-center space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black tracking-tight">{item.title}</h3>
                            {isLocked && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-3 py-1">برو</Badge>}
                        </div>
                        {item.instructions && (
                            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 font-medium">
                                {item.instructions}
                            </p>
                        )}
                        <div className="pt-2">
                            <Button 
                                className="rounded-2xl px-8 h-12 font-black transition-all hover:gap-3" 
                                onClick={() => handleAction(item, () => item.downloadUrl && window.open(item.downloadUrl, '_blank'))}
                            >
                                {isLocked ? (userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? <Coins className="ml-2 h-4 w-4" /> : <Lock className="ml-2 h-4 w-4" />) : <ExternalLink className="ml-2 h-4 w-4" />}
                                {isLocked ? (userProfile && userProfile.points >= (refConfig?.pointsPerUnlock || 5) ? 'فتح بالنقاط' : 'ترقية للزيارة') : 'زيارة الموقع'}
                            </Button>
                        </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        );
      default:
        return <div className="text-center p-12 text-muted-foreground font-bold">هذا النمط قيد التطوير...</div>;
    }
  };
  
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <div className="sticky top-0 z-20">
             <Header showMenu={false} title={areAllCategoriesLoading ? '...' : (category?.name || "قسم غير معروف")}>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
             </Header>
            <div className="relative z-10 -mt-12">
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
           <DialogContent dir="rtl" className="max-w-sm rounded-[2rem] gap-0 p-0 overflow-hidden border-none shadow-2xl">
               <div className="p-6 text-center space-y-4">
                   <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl mx-auto flex items-center justify-center animate-pulse">
                       <Coins className="w-10 h-10" />
                   </div>
                   <DialogHeader className="space-y-2">
                       <DialogTitle className="text-2xl font-bold">فتح محتوى برو</DialogTitle>
                       <p className="text-sm text-muted-foreground leading-relaxed font-bold">
                           هل تريد استخدام <strong>{showUnlockDialog?.cost} نقطة</strong> من رصيدك لفتح هذا الملف بشكل دائم؟
                       </p>
                   </DialogHeader>
                   <div className="bg-primary/5 py-2 px-4 rounded-full text-xs font-bold text-primary border border-primary/10 inline-block">
                       رصيدك الحالي: {userProfile?.points || 0} نقطة
                   </div>
               </div>
               <DialogFooter className="flex-row border-t p-0">
                   <Button variant="ghost" className="flex-1 h-14 rounded-none text-muted-foreground font-bold" onClick={() => setShowUnlockDialog(null)}>إلغاء</Button>
                   <div className="w-px bg-border h-14" />
                   <Button className="flex-1 h-14 rounded-none font-black text-lg" onClick={confirmUnlock}>تأكيد الخصم</Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>

      <UpgradeProDialog isOpen={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
}
