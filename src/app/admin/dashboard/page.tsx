'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Plus, Edit2, Trash2, Settings, CheckCircle, Loader2, Layers, Send, ChevronUp, ChevronDown, Zap, CreditCard, ArrowRight, ChevronRight, Monitor, Bell, Palette, FileCode, UserPlus, Users, Wallet, UserCog, ImageIcon, Layout, Hammer, Music, Save, Globe, Check, Clock, Code2, Link2, Share2, Brush, ExternalLink, Package, ShieldCheck, Mail, User, Crown, ExternalLink as AffiliateIcon
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Category, ContentItem, ThemeConfig, SubscriptionDialogConfig, ShareLinkConfig, RequestDesignConfig, Notification, PricingPlan, WhitelistEntry, AffiliateAd, AffiliateConfig } from '@/lib/definitions';
import { createUserByAdmin } from '@/lib/user-actions';

const categorySchema = z.object({ 
    name: z.string().min(2, "الاسم مطلوب"), 
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6', 'style7']).default('style1'), 
    visibility: z.enum(['public', 'pro']).default('public'), 
    isUnderMaintenance: z.boolean().default(false), 
    fileTypes: z.string().optional(), 
    parentId: z.string().nullable().default(null) 
});

const itemSchema = z.object({ 
    title: z.string().min(2, "العنوان مطلوب"), 
    imageUrl: z.string().url("رابط الصورة غير صالح").or(z.literal('')), 
    audioUrl: z.string().optional(), 
    downloadUrl: z.string().optional(), 
    prompt: z.string().optional(), 
    instructions: z.string().optional(), 
    videoUrl: z.string().optional(), 
    appVersion: z.string().optional(), 
    screenshots: z.string().optional(), 
    visibility: z.enum(['public', 'pro']).default('public'), 
    isNew: z.boolean().default(false) 
});

const affiliateSchema = z.object({
    link: z.string().url("الرابط غير صالح"),
    imageUrl: z.string().url("رابط الصورة غير صالح"),
    placement: z.enum(['banner', 'inline']),
    targetCategoryId: z.string().optional().nullable(),
    enabled: z.boolean().default(true)
});

const planSchema = z.object({
    name: z.string().min(2, "اسم الباقة مطلوب"),
    price: z.string().min(1, "السعر مطلوب"),
    currency: z.string().default('ر.س'),
    description: z.string(),
    features: z.string(),
    isFeatured: z.boolean().default(false),
    enabled: z.boolean().default(true),
    link: z.string().optional()
});

const userSchema = z.object({
    email: z.string().email("البريد غير صالح"),
    displayName: z.string().min(3, "الاسم مطلوب"),
    password: z.string().min(6, "6 أحرف على الأقل"),
    role: z.enum(['admin', 'editor', 'pro']).default('pro')
});

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTool, setActiveTool] = useState<'content' | 'plans' | 'users' | 'affiliate' | 'settings' | 'notifications'>('content');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  
  const allCategories = useMemo(() => rawCategories ? [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [], [rawCategories]);
  const mainCategories = useMemo(() => allCategories.filter(c => !c.parentId), [allCategories]);
  const currentCategory = useMemo(() => selectedParentId ? allCategories.find(c => c.id === selectedParentId) : null, [selectedParentId, allCategories]);
  const subCategories = useMemo(() => selectedParentId ? allCategories.filter(c => c.parentId === selectedParentId) : [], [allCategories, selectedParentId]);

  const itemsQuery = useMemoFirebase(() => selectedParentId ? query(collection(firestore!, 'categories', selectedParentId, 'items'), orderBy('order', 'asc')) : null, [firestore, selectedParentId]);
  const { data: currentItems = [] } = useCollection<ContentItem>(itemsQuery);

  const catForm = useForm({ resolver: zodResolver(categorySchema), defaultValues: { name: '', displayStyle: 'style1' as const, visibility: 'public' as const, isUnderMaintenance: false, fileTypes: '', parentId: null } });
  const itemForm = useForm({ resolver: zodResolver(itemSchema), defaultValues: { title: '', imageUrl: '', audioUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', appVersion: '', screenshots: '', visibility: 'public' as const, isNew: false } });

  const onUpdateCategory = async (values: any) => {
      if (!firestore || !isAdmin) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          await setDoc(doc(firestore, 'categories', catId), { 
              ...values, 
              parentId: values.parentId || null, 
              order: isNew ? allCategories.length : (editingCategory!.order ?? 0), 
              createdAt: isNew ? serverTimestamp() : (editingCategory!.createdAt || serverTimestamp()) 
          }, { merge: true });
          toast({ title: "تم الحفظ بنجاح" }); setEditingCategory(null); catForm.reset();
      } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const onSaveItem = async (values: any) => {
    if (!firestore || !selectedParentId) return;
    try {
      const screenshotsArray = values.screenshots ? values.screenshots.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];
      const itemData: any = { ...values, screenshots: screenshotsArray, updatedAt: serverTimestamp(), status: isAdmin ? 'approved' : 'pending' };
      
      if (editingItem && isAdmin) {
          await setDoc(doc(firestore, 'categories', selectedParentId, 'items', editingItem.id), itemData, { merge: true });
      } else {
          await addDocumentNonBlocking(collection(firestore, 'categories', selectedParentId, 'items'), { ...itemData, order: currentItems.length, createdAt: serverTimestamp() });
      }
      
      toast({ title: isAdmin ? "تم النشر بنجاح" : "تم الإرسال للمراجعة" });
      itemForm.reset(); setIsAddingItem(false); setEditingItem(null);
    } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-foreground pb-24" dir="rtl">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b">
        <div className="container mx-auto max-w-6xl px-4 h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 shrink-0">
                <div className="bg-primary text-primary-foreground p-2 rounded-xl"><Monitor className="h-5 w-5" /></div>
                <h1 className="text-xs font-black hidden sm:block">إدارة المنصة</h1>
            </div>
            
            <ScrollArea className="flex-1 max-w-full">
                <nav className="flex gap-1 bg-secondary/50 p-1 rounded-2xl border whitespace-nowrap">
                    {[
                        { id: 'content', label: 'المحتوى', icon: Layers }, 
                        { id: 'plans', label: 'الباقات', icon: Package },
                        { id: 'users', label: 'المستخدمين', icon: Users },
                        { id: 'affiliate', label: 'إعلانات Affiliate', icon: AffiliateIcon },
                        { id: 'settings', label: 'المظهر', icon: Settings },
                        { id: 'notifications', label: 'الإشعارات', icon: Bell }
                    ].map(tool => (
                        isAdmin || (tool.id === 'content' && isEditor) ? (
                            <button key={tool.id} onClick={() => { setActiveTool(tool.id as any); setSelectedParentId(null); }} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all", activeTool === tool.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50")}>
                                <tool.icon className="h-3.5 w-3.5" /> {tool.label}
                            </button>
                        ) : null
                    ))}
                </nav>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            <Button variant="ghost" size="sm" onClick={() => router.push('/home')} className="font-black text-[10px] gap-1 shrink-0 px-2">الموقع <ArrowRight className="h-3 w-3" /></Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {activeTool === 'content' && (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-[2.5rem] border shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        {selectedParentId && <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedParentId(currentCategory?.parentId || null)}><ChevronRight className="h-6 w-6" /></Button>}
                        <div>
                            <h2 className="text-2xl font-black">{selectedParentId ? currentCategory?.name : 'إدارة المحتوى'}</h2>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1">{selectedParentId ? 'تعديل المحتوى والأقسام الفرعية' : 'تحكم في أقسام الموقع الرئيسية'}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        {isAdmin && !selectedParentId && (
                            <Dialog open={!!editingCategory} onOpenChange={o => !o && setEditingCategory(null)}>
                                <DialogTrigger asChild>
                                    <Button className="flex-1 sm:flex-none rounded-2xl h-12 px-6 font-black" onClick={() => { catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null }); setEditingCategory({id:''} as any); }}>
                                        <Plus className="ml-2 h-5 w-5" /> قسم جديد
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2.5rem] max-w-md" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="font-black text-xl">إعدادات القسم</DialogTitle>
                                    </DialogHeader>
                                    <Form {...catForm}>
                                        <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-5 pt-4">
                                            <FormField control={catForm.control} name="name" render={({field})=><FormItem><FormLabel className="text-xs font-black">اسم القسم</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={catForm.control} name="displayStyle" render={({field})=><FormItem><FormLabel className="text-xs font-black">نمط العرض</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent className="rounded-xl">
                                                        {['style1','style2','style3','style4','style5','style6','style7'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select><FormMessage /></FormItem>} />
                                                <FormField control={catForm.control} name="visibility" render={({field})=><FormItem><FormLabel className="text-xs font-black">الظهور</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="public">عام</SelectItem>
                                                        <SelectItem value="pro">برو فقط</SelectItem>
                                                    </SelectContent>
                                                </Select><FormMessage /></FormItem>} />
                                            </div>
                                            <FormField control={catForm.control} name="fileTypes" render={({field})=><FormItem><FormLabel className="text-xs font-black">صيغ الملفات (مثلاً: PSD, AI)</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                            <FormField control={catForm.control} name="isUnderMaintenance" render={({field})=><FormItem className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border"><div className="space-y-0.5"><FormLabel className="font-black text-xs">وضع الصيانة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>} />
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl">حفظ القسم</Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                        {selectedParentId && (
                            <Dialog open={isAddingItem} onOpenChange={o => { setIsAddingItem(o); if(!o) setEditingItem(null); }}>
                                <DialogTrigger asChild><Button variant="outline" className="flex-1 sm:flex-none rounded-2xl h-12 px-6 font-black border-2"><Send className="ml-2 h-5 w-5" /> منشور جديد</Button></DialogTrigger>
                                <DialogContent className="rounded-[2.5rem] max-w-2xl" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="font-black text-xl">إضافة محتوى جديد</DialogTitle>
                                    </DialogHeader>
                                    <ScrollArea className="max-h-[80vh] px-1">
                                        <Form {...itemForm}>
                                            <form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-5 pt-4 pb-6">
                                                <FormField control={itemForm.control} name="title" render={({field})=><FormItem><FormLabel className="text-xs font-black">العنوان</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField control={itemForm.control} name="imageUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط الصورة</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                                    <FormField control={itemForm.control} name="downloadUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط التحميل</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField control={itemForm.control} name="audioUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط الصوت (Style 7)</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                                    <FormField control={itemForm.control} name="videoUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط الفيديو (Style 4)</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                                </div>
                                                <FormField control={itemForm.control} name="prompt" render={({field})=><FormItem><FormLabel className="text-xs font-black">نص البرومبت (Style 3)</FormLabel><FormControl><Textarea {...field} className="rounded-xl" rows={3}/></FormControl><FormMessage /></FormItem>} />
                                                <FormField control={itemForm.control} name="screenshots" render={({field})=><FormItem><FormLabel className="text-xs font-black">روابط المعرض (Style 5 - مفصولة بفاصلة)</FormLabel><FormControl><Textarea {...field} className="rounded-xl" rows={2}/></FormControl><FormMessage /></FormItem>} />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={itemForm.control} name="visibility" render={({field})=><FormItem><FormLabel className="text-xs font-black">الظهور</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="public">عام</SelectItem>
                                                            <SelectItem value="pro">برو فقط</SelectItem>
                                                        </SelectContent>
                                                    </Select><FormMessage /></FormItem>} />
                                                    <FormField control={itemForm.control} name="isNew" render={({field})=><FormItem className="flex items-center justify-between p-3 border rounded-xl h-12"><FormLabel className="font-black text-xs">جديد؟</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>} />
                                                </div>
                                                <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl">نشر الآن</Button>
                                            </form>
                                        </Form>
                                    </ScrollArea>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {!selectedParentId ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainCategories.map(cat => (
                            <Card key={cat.id} className="rounded-[2.5rem] overflow-hidden shadow-xl border-none transition-all hover:scale-[1.02]">
                                <CardHeader className="bg-primary text-primary-foreground p-8">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="font-black text-2xl">{cat.name}</CardTitle>
                                        <Badge className="bg-white/20 text-white border-none">{cat.displayStyle}</Badge>
                                    </div>
                                </CardHeader>
                                <CardFooter className="p-4 bg-muted/30 flex gap-2">
                                    <Button className="flex-1 rounded-xl font-black h-12" onClick={() => setSelectedParentId(cat.id)}>إدارة القسم</Button>
                                    {isAdmin && (
                                        <>
                                            <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 border-2" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive h-12 w-12" onClick={() => confirm("هل أنت متأكد من حذف القسم؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>
                                        </>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4">
                            <h3 className="font-black text-sm text-primary uppercase tracking-widest px-2">الأقسام الفرعية</h3>
                            {subCategories.map(sub => (
                                <div key={sub.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
                                    <span className="font-black text-sm">{sub.name}</span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedParentId(sub.id)}><Layers className="h-4 w-4" /></Button>
                                        {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف القسم الفرعي؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', sub.id))}><Trash2 className="h-4 w-4" /></Button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="lg:col-span-8 space-y-4">
                            <h3 className="font-black text-sm text-primary uppercase tracking-widest px-2">محتوى القسم</h3>
                            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-sm bg-white">
                                <ScrollArea className="h-[600px]">
                                    <div className="divide-y">
                                        {currentItems.map(item => (
                                            <div key={item.id} className="p-5 flex items-center justify-between hover:bg-muted/30">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-muted overflow-hidden border shadow-inner">
                                                        {item.imageUrl ? <img src={item.imageUrl} className="h-full w-full object-cover" alt="" /> : <ImageIcon className="h-full w-full p-4 opacity-20" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm leading-tight">{item.title}</p>
                                                        <div className="flex gap-2 mt-1.5">
                                                            {item.visibility === 'pro' && <Badge className="bg-yellow-500 text-[8px] h-4">PRO</Badge>}
                                                            {item.status === 'pending' && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[8px] h-4">قيد المراجعة</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isAdmin && (
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف المنشور؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedParentId, 'items', item.id))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        )}

        {isAdmin && activeTool === 'plans' && <FormPlansControl />}
        {isAdmin && activeTool === 'users' && <FormUsersControl />}
        {isAdmin && activeTool === 'affiliate' && <FormAffiliateControl />}
        {isAdmin && activeTool === 'settings' && <FormSettingsControl />}
        {isAdmin && activeTool === 'notifications' && <FormNotificationsControl />}
      </main>
    </div>
  );
}

function FormAffiliateControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const adsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'affiliateAds')) : null, [firestore]);
    const { data: rawAds } = useCollection<AffiliateAd>(adsQuery);
    const ads = useMemo(() => rawAds ? [...rawAds].sort((a, b) => (a.order || 0) - (b.order || 0)) : [], [rawAds]);

    const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'affiliate') : null, [firestore]);
    const { data: config } = useDoc<AffiliateConfig>(configRef);

    const catQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories'), orderBy('name', 'asc')) : null, [firestore]);
    const { data: cats } = useCollection<Category>(catQuery);

    const form = useForm({
        resolver: zodResolver(affiliateSchema),
        defaultValues: { link: '', imageUrl: '', placement: 'inline' as const, targetCategoryId: null, enabled: true }
    });

    const [frequency, setFrequency] = useState(6);
    useEffect(() => { if (config) setFrequency(config.adFrequency || 6); }, [config]);

    const onSaveConfig = async () => {
        if (!configRef) return;
        try { await setDoc(configRef, { adFrequency: frequency }, { merge: true }); toast({ title: "تم التحديث" }); } catch (e) { toast({ title: "فشل", variant: "destructive" }); }
    };

    const onSaveAd = async (values: any) => {
        if (!firestore) return;
        try {
            await addDocumentNonBlocking(collection(firestore, 'affiliateAds'), {
                ...values,
                targetCategoryId: values.targetCategoryId === 'global' ? null : values.targetCategoryId,
                order: ads.length,
                createdAt: serverTimestamp()
            });
            toast({ title: "تمت الإضافة" }); form.reset();
        } catch (e) { toast({ title: "خطأ", variant: "destructive" }); }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                <CardHeader className="p-0 mb-6"><CardTitle className="font-black text-xl flex items-center gap-2"><Settings className="h-6 w-6 text-primary" /> إعدادات تكرار الإعلانات</CardTitle></CardHeader>
                <div className="flex gap-2">
                    <Input type="number" value={frequency} onChange={e => setFrequency(parseInt(e.target.value))} className="rounded-xl h-12" placeholder="عدد المنشورات الفاصلة (مثلاً: 6)" />
                    <Button onClick={onSaveConfig} className="rounded-xl px-6 font-black h-12">حفظ التكرار</Button>
                </div>
            </Card>

            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                <CardHeader className="p-0 mb-6"><CardTitle className="font-black text-xl flex items-center gap-2"><AffiliateIcon className="h-6 w-6 text-primary" /> إضافة إعلان Affiliate جديد</CardTitle></CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSaveAd)} className="space-y-4">
                        <FormField control={form.control} name="link" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط المنتج (Affiliate Link)</FormLabel><FormControl><Input {...field} dir="ltr" className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="imageUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط صورة الإعلان</FormLabel><FormControl><Input {...field} dir="ltr" className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="placement" render={({field})=><FormItem><FormLabel className="text-xs font-black">مكان الظهور</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="inline">بين المنشورات (صورة كاملة)</SelectItem>
                                    <SelectItem value="banner">بانر سفلي (مقاس AdMob)</SelectItem>
                                </SelectContent>
                            </Select><FormMessage /></FormItem>} />
                            <FormField control={form.control} name="targetCategoryId" render={({field})=><FormItem><FormLabel className="text-xs font-black">القسم المستهدف (اختياري)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'global'}>
                                <FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="global">عام (كل الأقسام)</SelectItem>
                                    {cats?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select><FormMessage /></FormItem>} />
                        </div>
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl">إضافة الإعلان الآن</Button>
                    </form>
                </Form>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ads.map(ad => (
                    <Card key={ad.id} className="p-4 rounded-[2rem] border shadow-sm relative group overflow-hidden">
                        <div className="aspect-video rounded-xl bg-muted overflow-hidden mb-3">
                            <img src={ad.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-primary">{ad.placement === 'banner' ? 'بانر سفلي' : 'بين المنشورات'}</p>
                                <p className="text-[8px] text-muted-foreground truncate max-w-[150px]">{ad.link}</p>
                            </div>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف الإعلان؟") && deleteDocumentNonBlocking(doc(firestore!, 'affiliateAds', ad.id))}><Trash2 className="h-4 w-4" /></Button>
                                <Switch checked={ad.enabled} onCheckedChange={(v) => updateDocumentNonBlocking(doc(firestore!, 'affiliateAds', ad.id), { enabled: v })} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function FormPlansControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
    const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null, [firestore]);
    const { data: plans } = useCollection<PricingPlan>(plansQuery);

    const form = useForm({
        resolver: zodResolver(planSchema),
        defaultValues: { name: '', price: '', currency: 'ر.س', description: '', features: '', isFeatured: false, enabled: true, link: '' }
    });

    const onSave = async (values: any) => {
        if (!firestore) return;
        try {
            const planId = editingPlan?.id || doc(collection(firestore, 'pricingPlans')).id;
            await setDoc(doc(firestore, 'pricingPlans', planId), {
                ...values, features: values.features.split(',').map((f: string) => f.trim()),
                order: editingPlan ? editingPlan.order : (plans?.length || 0)
            }, { merge: true });
            toast({ title: "تم الحفظ" }); setEditingPlan(null); form.reset();
        } catch (e) { toast({ title: "فشل", variant: "destructive" }); }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                <CardHeader className="p-0 mb-6"><CardTitle className="font-black text-xl flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> {editingPlan ? 'تعديل باقة' : 'إضافة باقة جديدة'}</CardTitle></CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({field})=><FormItem><FormLabel className="text-xs font-black">اسم الباقة</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="price" render={({field})=><FormItem><FormLabel className="text-xs font-black">السعر</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                                <FormField control={form.control} name="currency" render={({field})=><FormItem><FormLabel className="text-xs font-black">العملة</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                            </div>
                        </div>
                        <FormField control={form.control} name="description" render={({field})=><FormItem><FormLabel className="text-xs font-black">وصف قصير</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="features" render={({field})=><FormItem><FormLabel className="text-xs font-black">المميزات (مفصولة بفاصلة ,)</FormLabel><FormControl><Textarea {...field} className="rounded-xl"/></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="link" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط دفع خارجي (اختياري)</FormLabel><FormControl><Input {...field} dir="ltr" className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="isFeatured" render={({field})=><FormItem className="flex items-center justify-between p-3 border rounded-xl"><FormLabel className="font-black text-xs">تمييز؟</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>} />
                            <FormField control={form.control} name="enabled" render={({field})=><FormItem className="flex items-center justify-between p-3 border rounded-xl"><FormLabel className="font-black text-xs">تفعيل؟</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>} />
                        </div>
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl">حفظ الباقة</Button>
                    </form>
                </Form>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans?.map(p => (
                    <Card key={p.id} className="p-6 rounded-[2rem] border-2 flex justify-between items-start">
                        <div><h4 className="font-black text-lg">{p.name}</h4><p className="text-primary font-black">{p.price} {p.currency}</p></div>
                        <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={()=>{setEditingPlan(p); form.reset({...p, features: p.features.join(', ')});}}><Edit2 className="h-4 w-4"/></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={()=>confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'pricingPlans', p.id))}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function FormUsersControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
    const { data: users } = useCollection<WhitelistEntry>(whitelistQuery);

    const form = useForm({
        resolver: zodResolver(userSchema),
        defaultValues: { email: '', role: 'pro' as const, displayName: '', password: '' }
    });

    const onAddUser = async (values: any) => {
        try {
            const res = await createUserByAdmin(values);
            if (res.success) { toast({ title: "تمت الإضافة" }); form.reset(); }
            else toast({ title: res.error || "فشل", variant: "destructive" });
        } catch (e) { toast({ title: "خطأ", variant: "destructive" }); }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
                <CardHeader className="p-0 mb-6"><CardTitle className="font-black text-xl flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> إضافة مستخدم جديد</CardTitle></CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onAddUser)} className="space-y-4">
                        <FormField control={form.control} name="displayName" render={({field})=><FormItem><FormLabel className="text-xs font-black">الاسم الكامل</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="email" render={({field})=><FormItem><FormLabel className="text-xs font-black">البريد الإلكتروني</FormLabel><FormControl><Input {...field} dir="ltr" className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="password" render={({field})=><FormItem><FormLabel className="text-xs font-black">كلمة المرور المؤقتة</FormLabel><FormControl><Input {...field} type="password" dir="ltr" className="rounded-xl h-12"/></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="role" render={({field})=><FormItem><FormLabel className="text-xs font-black">الصلاحية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="admin">مدير (Admin)</SelectItem>
                                <SelectItem value="editor">محرر (Editor)</SelectItem>
                                <SelectItem value="pro">عضو برو (Pro)</SelectItem>
                            </SelectContent>
                        </Select><FormMessage /></FormItem>} />
                        <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl" disabled={form.formState.isSubmitting}>إنشاء الحساب</Button>
                    </form>
                </Form>
            </Card>
            <div className="bg-white border rounded-2xl overflow-hidden divide-y">
                {users?.map(u => (
                    <div key={u.id} className="p-4 flex items-center justify-between">
                        <div><p className="font-black text-sm">{u.email}</p><Badge variant="outline" className="text-[8px]">{u.role}</Badge></div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'whitelist', u.id!))}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FormSettingsControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const themeRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'theme') : null, [firestore]);
    const { data: theme } = useDoc<ThemeConfig>(themeRef);
    const [themeConfig, setThemeConfig] = useState<ThemeConfig>({ primaryColor: '350 72% 51%', primaryColorDark: '350 72% 51%' });

    const popupRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'subscriptionDialog') : null, [firestore]);
    const { data: popup } = useDoc<SubscriptionDialogConfig>(popupRef);
    const [popupConfig, setPopupConfig] = useState<SubscriptionDialogConfig>({ enabled: false, title: '', description: '', link: '' });

    useEffect(() => { if (theme) setThemeConfig(theme); if (popup) setPopupConfig(popup); }, [theme, popup]);

    const saveTheme = async () => { if (themeRef) { await setDoc(themeRef, themeConfig, { merge: true }); toast({ title: "تم حفظ المظهر" }); } };
    const savePopup = async () => { if (popupRef) { await setDoc(popupRef, popupConfig, { merge: true }); toast({ title: "تم حفظ النافذة" }); } };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white space-y-6">
                <CardTitle className="font-black text-xl flex items-center gap-2"><Palette className="h-6 w-6 text-primary" /> ألوان الموقع (HSL)</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-xs font-black">الوضع الفاتح</label><Input value={themeConfig.primaryColor} onChange={e => setThemeConfig({...themeConfig, primaryColor: e.target.value})} dir="ltr" className="rounded-xl h-12"/></div>
                    <div className="space-y-2"><label className="text-xs font-black">الوضع الداكن</label><Input value={themeConfig.primaryColorDark || ''} onChange={e => setThemeConfig({...themeConfig, primaryColorDark: e.target.value})} dir="ltr" className="rounded-xl h-12"/></div>
                </div>
                <Button onClick={saveTheme} className="w-full h-12 rounded-xl font-black">تطبيق الألوان</Button>
            </Card>

            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white space-y-6">
                <div className="flex items-center justify-between"><CardTitle className="font-black text-xl">نافذة الاشتراك</CardTitle><Switch checked={popupConfig.enabled} onCheckedChange={v => setPopupConfig({...popupConfig, enabled: v})} /></div>
                <div className="space-y-4">
                    <Input placeholder="العنوان" value={popupConfig.title} onChange={e => setPopupConfig({...popupConfig, title: e.target.value})} className="rounded-xl h-12"/>
                    <Textarea placeholder="الوصف" value={popupConfig.description} onChange={e => setPopupConfig({...popupConfig, description: e.target.value})} className="rounded-xl"/>
                    <Input placeholder="رابط الزر" value={popupConfig.link} onChange={e => setPopupConfig({...popupConfig, link: e.target.value})} dir="ltr" className="rounded-xl h-12"/>
                </div>
                <Button onClick={savePopup} className="w-full h-12 rounded-xl font-black">حفظ النافذة</Button>
            </Card>
        </div>
    );
}

function FormNotificationsControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const notificationsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null, [firestore]);
    const { data: notifications } = useCollection<Notification>(notificationsQuery);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');

    const send = async () => {
        if (!firestore || !title || !desc) return;
        try {
            await addDocumentNonBlocking(collection(firestore, 'notifications'), { title, description: desc, createdAt: serverTimestamp() });
            setTitle(''); setDesc(''); toast({ title: "تم الإرسال" });
        } catch (e) { toast({ title: "فشل" }); }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white space-y-4">
                <Input placeholder="عنوان الإشعار" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl h-12"/>
                <Textarea placeholder="نص الإشعار" value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl"/>
                <Button onClick={send} className="w-full h-14 rounded-2xl font-black shadow-xl"><Send className="ml-2 h-5 w-5" /> إرسال للجميع</Button>
            </Card>
            <div className="space-y-2">
                {notifications?.map(notif => (
                    <div key={notif.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
                        <div className="flex-1 min-w-0"><p className="font-black text-xs truncate">{notif.title}</p></div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'notifications', notif.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
