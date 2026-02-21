'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Plus, Edit2, Trash2, Settings, CheckCircle, Loader2, Layers, Send, ChevronUp, ChevronDown, Zap, CreditCard, ArrowRight, ChevronRight, Monitor, Bell, Palette, FileCode, UserPlus, Users, Wallet, UserCog, Image as ImageIcon, Layout, Hammer, Music, Save, Globe, Check, Clock
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, writeBatch, orderBy } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createUserByAdmin } from '@/lib/user-actions';
import type { Category, ContentItem, PricingPlan, WhitelistEntry, PaymentMethod, SubscriptionDialogConfig, AdsConfig } from '@/lib/definitions';

const itemSchema = z.object({ title: z.string().min(2, "العنوان مطلوب"), imageUrl: z.string().url("رابط الصورة غير صالح").or(z.literal('')), audioUrl: z.string().optional(), downloadUrl: z.string().optional(), prompt: z.string().optional(), instructions: z.string().optional(), videoUrl: z.string().optional(), appVersion: z.string().optional(), screenshots: z.string().optional(), visibility: z.enum(['public', 'pro']).default('public'), isNew: z.boolean().default(false) });
const categorySchema = z.object({ name: z.string().min(2, "الاسم مطلوب"), displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6', 'style7']).default('style1'), visibility: z.enum(['public', 'pro']).default('public'), isUnderMaintenance: z.boolean().default(false), fileTypes: z.string().optional(), parentId: z.string().nullable().default(null) });
const planSchema = z.object({ name: z.string().min(2, "الاسم مطلوب"), price: z.string().min(1, "السعر مطلوب"), currency: z.string().default("ر.س"), description: z.string().min(5, "الوصف مطلوب"), features: z.string(), isFeatured: z.boolean().default(false), enabled: z.boolean().default(true) });
const newUserSchema = z.object({ displayName: z.string().min(3, "الاسم مطلوب"), email: z.string().email("بريد غير صالح"), password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف"), role: z.enum(['pro', 'admin', 'editor']).default('pro') });
const paymentMethodSchema = z.object({ name: z.string().min(2, "الاسم مطلوب"), icon: z.string().min(2, "الأيقونة مطلوبة"), link: z.string().min(1, "الرابط مطلوب"), isUrl: z.boolean().default(true), country: z.string().default('ALL'), enabled: z.boolean().default(true) });

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTool, setActiveTool] = useState<'content' | 'plans' | 'settings'>('content');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  const allCategories = useMemo(() => rawCategories ? [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [], [rawCategories]);
  const mainCategories = useMemo(() => allCategories.filter(c => !c.parentId), [allCategories]);
  const currentCategory = useMemo(() => selectedParentId ? allCategories.find(c => c.id === selectedParentId) : null, [selectedParentId, allCategories]);
  const subCategories = useMemo(() => selectedParentId ? allCategories.filter(c => c.parentId === selectedParentId) : [], [allCategories, selectedParentId]);

  const itemsQuery = useMemoFirebase(() => selectedParentId ? query(collection(firestore!, 'categories', selectedParentId, 'items'), orderBy('order', 'asc')) : null, [firestore, selectedParentId]);
  const { data: currentItems = [] } = useCollection<ContentItem>(itemsQuery);

  const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: plans } = useCollection<PricingPlan>(plansQuery);

  const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: whitelist } = useCollection<WhitelistEntry>(whitelistQuery);

  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'paymentMethods'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: payments } = useCollection<PaymentMethod>(paymentsQuery);

  const catForm = useForm({ resolver: zodResolver(categorySchema), defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null } });
  const itemForm = useForm({ resolver: zodResolver(itemSchema), defaultValues: { title: '', imageUrl: '', audioUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', appVersion: '', screenshots: '', visibility: 'public', isNew: false } });
  const userForm = useForm({ resolver: zodResolver(newUserSchema), defaultValues: { displayName: '', email: '', password: '', role: 'pro' } });
  const planForm = useForm({ resolver: zodResolver(planSchema), defaultValues: { name: '', price: '', currency: 'ر.س', description: '', features: '', isFeatured: false, enabled: true } });
  const paymentForm = useForm({ resolver: zodResolver(paymentMethodSchema), defaultValues: { name: '', icon: 'CreditCard', link: '', isUrl: true, country: 'ALL', enabled: true } });

  const onUpdateCategory = async (values: any) => {
      if (!firestore || !isAdmin) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          await setDoc(doc(firestore, 'categories', catId), { ...values, parentId: values.parentId || null, order: isNew ? allCategories.length : (editingCategory!.order ?? 0), createdAt: isNew ? serverTimestamp() : (editingCategory!.createdAt || serverTimestamp()) }, { merge: true });
          toast({ title: "تم الحفظ" }); setEditingCategory(null); catForm.reset();
      } catch (e) { toast({ title: "خطأ", variant: "destructive" }); }
  };

  const onSaveItem = async (values: any) => {
    if (!firestore || !selectedParentId) return;
    try {
      const screenshotsArray = values.screenshots ? values.screenshots.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];
      const itemData: any = { ...values, screenshots: screenshotsArray, updatedAt: serverTimestamp(), status: isAdmin ? 'approved' : 'pending' };
      if (editingItem && isAdmin) await setDoc(doc(firestore, 'categories', selectedParentId, 'items', editingItem.id), itemData, { merge: true });
      else await addDocumentNonBlocking(collection(firestore, 'categories', selectedParentId, 'items'), { ...itemData, order: currentItems.length, createdAt: serverTimestamp() });
      toast({ title: isAdmin ? "تم النشر" : "تم الإرسال للمراجعة" });
      itemForm.reset(); setIsAddingItem(false); setEditingItem(null);
    } catch (e) { toast({ title: "خطأ", variant: "destructive" }); }
  };

  const approveItem = async (item: ContentItem) => {
      if (!firestore || !isAdmin || !selectedParentId) return;
      try { await updateDocumentNonBlocking(doc(firestore, 'categories', selectedParentId, 'items', item.id), { status: 'approved' }); toast({ title: "تم الاعتماد" }); }
      catch (e) { toast({ title: "فشل", variant: "destructive" }); }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-foreground pb-24" dir="rtl">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b">
        <div className="container mx-auto max-w-6xl px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground p-2 rounded-xl"><Monitor className="h-5 w-5" /></div>
                <div><h1 className="text-sm font-black">إدارة المنصة</h1><p className="text-[9px] text-muted-foreground font-bold">لوحة التحكم</p></div>
            </div>
            <nav className="flex gap-1 bg-secondary/50 p-1 rounded-2xl border">
                {[{ id: 'content', label: 'المحتوى', icon: Layers }, { id: 'plans', label: 'الباقات', icon: CreditCard }, { id: 'settings', label: 'الإعدادات', icon: Settings }].map(tool => (
                    isAdmin || tool.id === 'content' ? (
                        <button key={tool.id} onClick={() => { setActiveTool(tool.id as any); setSelectedParentId(null); }} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px]", activeTool === tool.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground")}>
                            <tool.icon className="h-3.5 w-3.5" /> {tool.label}
                        </button>
                    ) : null
                ))}
            </nav>
            <Button variant="ghost" size="sm" onClick={() => router.push('/home')}>الموقع <ArrowRight className="h-3.5 w-3.5" /></Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {activeTool === 'content' && (
            <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {selectedParentId && <Button variant="ghost" size="icon" onClick={() => setSelectedParentId(currentCategory?.parentId || null)}><ChevronRight className="h-5 w-5" /></Button>}
                        <h2 className="text-2xl font-black">{selectedParentId ? currentCategory?.name : 'إدارة المحتوى'}</h2>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <Dialog open={!!editingCategory} onOpenChange={o => !o && setEditingCategory(null)}>
                                <DialogTrigger asChild><Button onClick={() => { catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: selectedParentId }); setEditingCategory({id:''} as any); }}><Plus className="ml-2 h-5 w-5" /> قسم جديد</Button></DialogTrigger>
                                <DialogContent className="rounded-[2.5rem]" dir="rtl">
                                    <DialogHeader><DialogTitle className="font-black">إعدادات القسم</DialogTitle></DialogHeader>
                                    <Form {...catForm}><form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-4 pt-4">
                                        <FormField control={catForm.control} name="name" render={({field})=><FormItem><FormLabel className="text-xs font-black">الاسم</FormLabel><FormControl><Input {...field} className="rounded-xl"/></FormControl></FormItem>} />
                                        <FormField control={catForm.control} name="displayStyle" render={({field})=><FormItem><FormLabel className="text-xs font-black">النمط</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger></FormControl><SelectContent className="rounded-xl">
                                            {['style1','style2','style3','style4','style5','style6','style7'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent></Select></FormItem>} />
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black">حفظ القسم</Button>
                                    </form></Form>
                                </DialogContent>
                            </Dialog>
                        )}
                        {selectedParentId && (
                            <Dialog open={isAddingItem} onOpenChange={o => { setIsAddingItem(o); if(!o) setEditingItem(null); }}>
                                <DialogTrigger asChild><Button variant="outline"><Send className="ml-2 h-5 w-5" /> منشور جديد</Button></DialogTrigger>
                                <DialogContent className="rounded-[2.5rem]" dir="rtl">
                                    <DialogHeader><DialogTitle className="font-black">نشر محتوى</DialogTitle></DialogHeader>
                                    <Form {...itemForm}><form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-4 pt-4">
                                        <FormField control={itemForm.control} name="title" render={({field})=><FormItem><FormLabel className="text-xs font-black">العنوان</FormLabel><FormControl><Input {...field} className="rounded-xl"/></FormControl></FormItem>} />
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black">نشر الآن</Button>
                                    </form></Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {!selectedParentId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainCategories.map(cat => (
                            <Card key={cat.id} className="rounded-[2.5rem] overflow-hidden shadow-xl border-none">
                                <CardHeader className="bg-primary text-primary-foreground p-8"><CardTitle className="font-black">{cat.name}</CardTitle><Badge className="bg-white/20 w-fit">{cat.displayStyle}</Badge></CardHeader>
                                <CardFooter className="p-4 bg-muted/30 flex gap-2">
                                    <Button className="flex-1 rounded-xl font-black" onClick={() => setSelectedParentId(cat.id)}>إدارة القسم</Button>
                                    {isAdmin && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4">
                            <h3 className="font-black text-sm text-primary">الأقسام الفرعية</h3>
                            {subCategories.map(sub => (
                                <div key={sub.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between">
                                    <span className="font-black text-sm">{sub.name}</span>
                                    <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setSelectedParentId(sub.id)}><Layers className="h-4 w-4" /></Button></div>
                                </div>
                            ))}
                        </div>
                        <div className="lg:col-span-8 space-y-4">
                            <h3 className="font-black text-sm text-primary">المحتوى</h3>
                            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-sm"><ScrollArea className="h-[500px]"><div className="divide-y">
                                {currentItems.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden">{item.imageUrl && <img src={item.imageUrl} className="h-full w-full object-cover" />}</div>
                                            <div><p className="font-black text-sm">{item.title}</p>{item.status === 'pending' && <Badge variant="secondary">مراجعة</Badge>}</div>
                                        </div>
                                        {isAdmin && item.status === 'pending' && <Button variant="ghost" size="icon" className="text-green-600" onClick={() => approveItem(item)}><Check className="h-5 w-5"/></Button>}
                                    </div>
                                ))}
                            </div></ScrollArea></Card>
                        </div>
                    </div>
                )}
            </div>
        )}

        {isAdmin && activeTool === 'settings' && (
            <div className="animate-in fade-in space-y-8">
                <Tabs defaultValue="ads" dir="rtl">
                    <TabsList className="bg-white rounded-2xl p-1 h-14 border"><TabsTrigger value="ads" className="rounded-xl font-black">إعدادات الإعلانات</TabsTrigger></TabsList>
                    <TabsContent value="ads"><Card className="rounded-[2.5rem] p-8 border-none shadow-xl"><FormAdsControl /></Card></TabsContent>
                </Tabs>
            </div>
        )}
      </main>
    </div>
  );
}

function FormAdsControl() {
    const firestore = useFirestore();
    const adsRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'ads') : null, [firestore]);
    const { data: ads } = useDoc<AdsConfig>(adsRef);
    const [config, setConfig] = useState<AdsConfig>({ enabled: false, adsterraEnabled: false, interstitialFrequency: 6, manualAdsEnabled: false });
    const { toast } = useToast();

    useEffect(() => { if (ads) setConfig({...config, ...ads}); }, [ads]);

    const save = async () => { await setDoc(adsRef!, config, { merge: true }); toast({ title: "تم التحديث" }); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border"><div><p className="text-sm font-black">تفعيل الإعلانات</p></div><Switch checked={config.enabled} onCheckedChange={v => setConfig({...config, enabled: v})} /></div>
            <div className="space-y-4">
                <label className="text-xs font-black">كود Native Banner</label>
                <Textarea value={config.nativeBannerScript} onChange={e => setConfig({...config, nativeBannerScript: e.target.value})} dir="ltr" className="h-32 font-mono text-[10px]" />
            </div>
            <Button onClick={save} className="w-full h-14 rounded-2xl font-black shadow-xl">حفظ الإعدادات</Button>
        </div>
    );
}
