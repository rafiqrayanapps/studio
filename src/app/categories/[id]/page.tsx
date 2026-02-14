'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { Category, ContentItem } from '@/lib/definitions';
import { ArrowLeft, Download, Copy, Search, Heart, AlertTriangle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Header from '@/components/layout/Header';
import useLocalStorage from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';
import { getYouTubeThumbnailUrl } from '@/lib/video-utils';
import CategorySkeleton from '@/components/skeletons/CategorySkeleton';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';

// Helper to gracefully handle old localized data
const getArabicString = (field: string | { ar: string, en: string } | undefined | null): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.ar || '';
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const firestore = useFirestore();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useLocalStorage<WithId<ContentItem>[]>('favorites', []);
  const { toast } = useToast();

  // --- START CACHING STRATEGY ---
  const [cachedAllCategories, setCachedAllCategories] = useLocalStorage<WithId<Category>[]>('allCategoriesCache', []);
  const [displayAllCategories, setDisplayAllCategories] = useState<WithId<Category>[]>(cachedAllCategories);
  const [cachedItems, setCachedItems] = useLocalStorage<WithId<ContentItem>[]>(`itemsCache-${id}`, []);
  const [displayItems, setDisplayItems] = useState<WithId<ContentItem>[]>(cachedItems);

  const categoryRef = useMemoFirebase(() => (firestore && id ? doc(firestore, 'categories', id) : null), [firestore, id]);
  const { data: category, isLoading: categoryLoading, error: categoryError } = useDoc<Category>(categoryRef, { propagateError: true });

  const allCategoriesQuery = useMemoFirebase(() => (
    firestore ? query(collection(firestore, 'categories')) : null
  ), [firestore]);
  const { data: liveAllCategories, isLoading: subCategoriesLoading } = useCollection<Category>(allCategoriesQuery, { propagateError: true });

  const itemsQuery = useMemoFirebase(() => (
    firestore && id ? query(collection(firestore, 'categories', id, 'items'), orderBy('order', 'asc')) : null
  ), [firestore, id]);
  const { data: liveItems, isLoading: itemsLoading } = useCollection<ContentItem>(itemsQuery, { propagateError: true });

  useEffect(() => {
      if (liveAllCategories) {
          setDisplayAllCategories(liveAllCategories);
          setCachedAllCategories(liveAllCategories);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAllCategories, setCachedAllCategories]);

  useEffect(() => {
      if (liveItems) {
          setDisplayItems(liveItems);
          setCachedItems(liveItems);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveItems, setCachedItems]);
  // --- END CACHING STRATEGY ---

  const subCategories = useMemo(() => {
    if (!displayAllCategories) return [];
    return displayAllCategories.filter((cat) => cat.parentId === id).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
  }, [displayAllCategories, id]);

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


  const filteredSubCategories = useMemo(() => {
    if (!subCategories) return [];
    return subCategories.filter((cat) => getArabicString(cat.name).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [subCategories, searchTerm]);

  const filteredItems = useMemo(() => {
    if (!displayItems) return [];
    return displayItems.filter((item) => getArabicString(item.title).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [displayItems, searchTerm]);


  // The page is only in a "loading" state if we are fetching data AND have no cached data to show.
  const isLoading = (categoryLoading && !category) || (subCategoriesLoading && cachedAllCategories.length === 0) || (itemsLoading && cachedItems.length === 0);

  const FavoriteButton = ({ item }: { item: WithId<ContentItem> }) => (
     <Button 
        size="icon" 
        className="absolute top-2 left-2 z-10 h-8 w-8 bg-black/50 hover:bg-black/70"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(item); }}
    >
        <Heart className={cn("h-4 w-4 text-white", isFavorite(item.id) && "fill-white")} />
    </Button>
  );

  const renderContent = () => {
    if (!filteredItems || filteredItems.length === 0) return null;

    const typedItems = filteredItems as WithId<ContentItem>[];

    const ItemCard = ({ item, children }: {item: WithId<ContentItem>, children: React.ReactNode}) => (
        <Card className="overflow-hidden bg-card border shadow-sm flex flex-col h-full group relative">
            <CardContent className="p-0 flex flex-col flex-1">
                {children}
            </CardContent>
        </Card>
    );

    switch (category?.displayStyle) {
      case 'style1':
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {typedItems.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col text-center group relative gap-y-3 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${(filteredSubCategories.length + index) * 100}ms` }}
              >
                <h3 className="font-bold text-base text-card-foreground min-h-[2.5rem] flex items-center justify-center">{getArabicString(item.title)}</h3>
                <div className="relative cursor-pointer aspect-square w-full" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                    {item.imageUrl && <Image src={item.imageUrl} alt={getArabicString(item.title)} fill className="object-cover rounded-lg shadow-md" />}
                    <FavoriteButton item={item} />
                </div>
                <div className="w-full mt-auto">
                     <a href={item.downloadUrl || '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <Button className="w-full">
                            <Download className="ml-2 h-4 w-4" />
                            تحميل
                        </Button>
                    </a>
                </div>
              </div>
            ))}
          </div>
        );
      case 'style2':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {typedItems.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col text-center group gap-y-3 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${(filteredSubCategories.length + index) * 100}ms` }}
              >
                 <h3 className="font-bold text-base">{getArabicString(item.title)}</h3>
                <div className="relative w-full cursor-pointer" onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
                    {item.imageUrl && <Image 
                      src={item.imageUrl} 
                      alt={getArabicString(item.title)}
                      width={500} 
                      height={300}
                      className="w-full h-auto object-cover rounded-lg shadow-md"
                    />}
                    <FavoriteButton item={item} />
                </div>
                <div className="w-full">
                    <a href={item.downloadUrl || '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Button className="w-full">
                        <Download className="ml-2 h-4 w-4" />
                        تحميل
                    </Button>
                    </a>
                </div>
              </div>
            ))}
          </div>
        );
      case 'style3':
        const Style3Item = ({ item }: { item: WithId<ContentItem> }) => {
            const { toast } = useToast();
            const handleCopy = () => {
                if (item.prompt) {
                    navigator.clipboard.writeText(item.prompt);
                    toast({ title: "تم نسخ البرومبت!" });
                }
            };
            return (
                <Card className="overflow-hidden bg-card text-card-foreground flex flex-col h-full group relative">
                    <CardContent className="p-4 flex flex-col flex-1 gap-4">
                        <h3 className="font-bold text-xl text-center">{getArabicString(item.title)}</h3>

                        <div className="relative cursor-pointer w-full rounded-lg overflow-hidden">
                            {item.imageUrl && <Image 
                              src={item.imageUrl} 
                              alt={getArabicString(item.title)}
                              width={500} 
                              height={300}
                              className="w-full h-auto object-cover"
                              onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}
                            />}
                            <FavoriteButton item={item} />
                        </div>

                        {item.instructions && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">التعليمات</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-muted rounded-md">{getArabicString(item.instructions)}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <h4 className="font-semibold text-foreground">البرومبت</h4>
                            <Textarea readOnly value={item.prompt || ''} className="h-28 bg-muted border-transparent" dir="ltr" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                            <Button variant="default" className="w-full" onClick={handleCopy}>
                                <Copy className="ml-2 h-4 w-4" />
                                نسخ البرومبت
                            </Button>
                            {item.downloadUrl && (
                                <Button asChild variant="secondary" className="w-full">
                                    <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="ml-2 h-4 w-4" />
                                        تحميل
                                    </a>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        };
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {typedItems.map((item, index) => (
                <div key={item.id} className="opacity-0 animate-fade-in-up h-full" style={{ animationDelay: `${(filteredSubCategories.length + index) * 100}ms` }}>
                    <Style3Item item={item} />
                </div>
            ))}
          </div>
        );
       case 'style4':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {typedItems.map((item, index) => (
                     <div
                        key={item.id}
                        className="opacity-0 animate-fade-in-up h-full"
                        style={{ animationDelay: `${(filteredSubCategories.length + index) * 100}ms` }}
                    >
                        <div className="overflow-hidden flex flex-col h-full group relative bg-primary text-primary-foreground p-4 rounded-2xl">
                            <div className="pb-2">
                                <h3 className="font-bold text-lg text-center">{getArabicString(item.title)}</h3>
                            </div>
                            
                            <a href={item.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="relative block">
                                <div className="aspect-video relative w-full cursor-pointer rounded-lg overflow-hidden shadow-lg" >
                                    <FavoriteButton item={item} />
                                    {item.imageUrl && <Image src={item.imageUrl} alt={getArabicString(item.title)} fill className="object-cover" />}
                                </div>
                            </a>
                            
                            <div className="pt-4 mt-auto">
                                <a href={item.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-full">
                                    <Button variant="secondary" className="w-full">
                                        <PlayCircle className="ml-2 h-4 w-4" />
                                        مشاهدة الفيديو
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
        case 'style5':
            const Style5Item = ({ item }: { item: WithId<ContentItem> }) => {
                const [emblaApi, setEmblaApi] = useState<CarouselApi>()
                
                const handleImageClick = (imageUrl: string) => {
                    setSelectedImage(imageUrl);
                };

                return (
                    <Card className="p-4 flex flex-col gap-4 bg-card text-card-foreground shadow-md rounded-2xl border">
                        <div className="flex gap-4 items-start">
                            {item.imageUrl && (
                                <Image src={item.imageUrl} alt={getArabicString(item.title)} width={64} height={64} className="rounded-xl border p-1 shadow-sm bg-background" />
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-xl">{getArabicString(item.title)}</h3>
                                {item.appVersion && <p className="text-primary font-semibold text-sm">الإصدار {item.appVersion}</p>}
                                <p className="text-muted-foreground text-sm mt-1">{getArabicString(item.instructions)}</p>
                            </div>
                        </div>
                        {item.screenshots && item.screenshots.length > 0 && (
                            <div className="relative">
                                <Carousel 
                                    setApi={setEmblaApi}
                                    className="w-full" 
                                    opts={{ 
                                        align: 'start', 
                                        dragFree: true,
                                        direction: 'rtl',
                                    }}>
                                    <CarouselContent className="-ml-1">
                                        {item.screenshots.map((ss, i) => (
                                            <CarouselItem key={i} className="basis-4/5 pl-1">
                                                <Image
                                                    src={ss}
                                                    alt={`لقطة شاشة ${i + 1} لـ ${getArabicString(item.title)}`}
                                                    width={1080}
                                                    height={1920}
                                                    sizes="(max-width: 768px) 80vw, 40vw"
                                                    priority={i === 0}
                                                    className="w-full h-auto rounded-lg bg-muted cursor-pointer"
                                                    onClick={() => handleImageClick(ss)}
                                                />
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>
                            </div>
                        )}
                        <a href={item.downloadUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-full mt-2">
                            <Button className="w-full">
                                <Download className="ml-2 h-4 w-4" />
                                تحميل
                            </Button>
                        </a>
                    </Card>
                );
            }
            return (
                <div className="space-y-6">
                    {typedItems.map((item, index) => (
                        <div key={item.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${(filteredSubCategories.length + index) * 100}ms` }}>
                            <Style5Item item={item} />
                        </div>
                    ))}
                </div>
            );
      default:
        return null;
    }
  };
  
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <div className="sticky top-0 z-20">
             <Header showMenu={false} title={categoryLoading ? '...' : (getArabicString(category?.name) || "قسم غير معروف")}>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
             </Header>
            <div className="relative z-10 -mt-10">
              <div className="pb-4 px-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="ابحث..." className="h-14 w-full rounded-2xl border-none bg-card pl-12 pr-4 text-lg shadow-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>
        </div>

      <main className="flex-1 px-6 pt-2 pb-24">
        {categoryError && !isLoading ? (
            <div className="text-center text-destructive p-12 bg-destructive/10 rounded-2xl mt-4 space-y-2">
                <AlertTriangle className="mx-auto h-8 w-8" /><h3 className="font-bold text-lg">خطأ في تحميل القسم</h3>
                <p className="text-sm">لم نتمكن من العثور على هذا القسم أو ليس لديك إذن لعرضه.</p>
            </div>
        ) : isLoading ? (
          <div className="space-y-8 mt-6">
             <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <CategorySkeleton key={i} className="h-36" />)}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Skeleton className="aspect-video w-full rounded-lg" /><Skeleton className="aspect-video w-full rounded-lg" /></div>
          </div>
        ) : (
          <div className="space-y-8 mt-4">
            {filteredSubCategories && filteredSubCategories.length > 0 && (
               <div className="grid grid-cols-2 gap-4">
                {filteredSubCategories.map((cat, index) => (
                  <div
                    key={cat.id}
                    className="relative group opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Link href={`/categories/${cat.id}`} passHref>
                       <div className="relative bg-primary p-4 text-primary-foreground rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-sm h-full min-h-36">
                        {cat.fileTypes && <div className="absolute top-2.5 right-2.5 bg-black/20 text-xs font-semibold px-2 py-0.5 rounded-full text-white">{cat.fileTypes}</div>}
                        <p className="font-bold text-lg text-center">{getArabicString(cat.name)}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {renderContent()}
            {(!filteredSubCategories || filteredSubCategories.length === 0) && (!filteredItems || filteredItems.length === 0) && !isLoading && (
                 <div className="text-center text-muted-foreground p-12"><p>لا يوجد محتوى في هذا القسم بعد.</p></div>
            )}
          </div>
        )}
      </main>

       <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0 shadow-none">
          <DialogHeader>
            <DialogTitle className="sr-only">معاينة الصورة</DialogTitle>
          </DialogHeader>
          {selectedImage && <Image src={selectedImage} alt="Preview" width={1200} height={800} className="w-full h-auto max-h-[90vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
