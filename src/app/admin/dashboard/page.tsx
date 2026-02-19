'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Settings, 
    CheckCircle, 
    Loader2,
    Layers,
    Send,
    ChevronUp,
    ChevronDown,
    Zap,
    CreditCard,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Bell,
    Share2,
    Brush,
    Palette,
    Info,
    FileCode,
    UserPlus,
    Users,
    Key,
    Globe,
    ExternalLink,
    Wallet,
    ShieldCheck,
    UserCog,
    X
} from 'lucide-react';

import { 
    useFirestore, 
    useCollection, 
    useMemoFirebase, 
    addDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    setDocumentNonBlocking, 
    useDoc,
    WithId
} from '@/firebase';
import { 
    collection, 
    query, 
    doc, 
    setDoc, 
    serverTimestamp, 
    writeBatch, 
    orderBy 
} from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

import type { 
    Category, 
    ContentItem, 
    PricingPlan, 
    ThemeConfig, 
    Notification, 
    ShareLinkConfig, 
    RequestDesignConfig, 
    WhitelistEntry, 
    PaymentMethod 
} from '@/lib/definitions';

// Schemas
const itemSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  imageUrl: z.string().url("رابط الصورة غير صالح"),
  downloadUrl: z.string().optional(),
  prompt: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().optional(),
  visibility: z.enum(['public', 'pro']).default('public'),
  isNew: z.boolean().default(false),
});

const categorySchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6']).default('style1'),
    visibility: z.enum(['public', 'pro']).default('public'),
    isUnderMaintenance: z.boolean().default(false),
    fileTypes: z.string().optional(),
    parentId: z.string().nullable().default(null),
});

const planSchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    price: z.string().min(1, "السعر مطلوب"),
    currency: z.string().default("ر.س"),
    description: z.string().min(5, "الوصف مطلوب"),
    features: z.string().describe("المميزات مفصولة بفاصلة"),
    isFeatured: z.boolean().default(false),
    enabled: z.boolean().default(true),
});

const whitelistSchema = z.object({
    email: z.string().email("بريد غير صالح"),
    activationCode: z.string().min(4, "الكود قصير جداً"),
    role: z.enum(['pro', 'admin', 'editor']).default('pro'),
});

const paymentMethodSchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    icon: z.string().min(2, "اسم الأيقونة مطلوب"),
    link: z.string().min(1, "الرابط أو النص مطلوب"),
    isUrl: z.boolean().default(true),
    country: z.string().default('ALL'),
    enabled: z.boolean().default(true),
});

const themeSchema = z.object({
    primaryColor: z.string().regex(/^\d+\s\d+%\s\d+%$/, "صيغة HSL غير صحيحة (مثال: 350 72% 51%)"),
    primaryColorDark: z.string().regex(/^\d+\s\d+%\s\d+%$/, "صيغة HSL غير صحيحة").optional(),
});

const notifySchema = z.object({
    title: z.string().min(2, "العنوان مطلوب"),
    description: z.string().min(5, "نص الإشعار مطلوب"),
});

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTool, setActiveTool] = useState<'content' | 'plans' | 'settings'>('content');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingWhitelist, setIsAddingWhitelist] = useState(false);

  // Data Fetching
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  
  const allCategories = useMemo(() => {
      if (!rawCategories) return [];
      return [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawCategories]);

  const mainCategories = useMemo(() => allCategories.filter(c => !c.parentId), [allCategories]);
  const currentCategory = useMemo(() => selectedParentId ? allCategories.find(c => c.id === selectedParentId) : null, [selectedParentId, allCategories]);
  const subCategories = useMemo(() => selectedParentId ? allCategories.filter(c => c.parentId === selectedParentId) : [], [allCategories, selectedParentId]);

  const itemsQuery = useMemoFirebase(() => selectedParentId ? query(collection(firestore!, 'categories', selectedParentId, 'items')) : null, [firestore, selectedParentId]);
  const { data: rawItems } = useCollection<ContentItem>(itemsQuery);
  const currentItems = useMemo(() => rawItems ? [...rawItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [], [rawItems]);

  const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: plans } = useCollection<PricingPlan>(plansQuery);

  const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: whitelist } = useCollection<WhitelistEntry>(whitelistQuery);

  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'paymentMethods'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: payments } = useCollection<PaymentMethod>(paymentsQuery);

  // Forms
  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null }
  });

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', visibility: 'public', isNew: false }
  });

  const planForm = useForm<z.infer<typeof planSchema>>({
      resolver: zodResolver(planSchema),
      defaultValues: { name: '', price: '', currency: 'ر.س', features: '', isFeatured: false, enabled: true }
  });

  const whitelistForm = useForm<z.infer<typeof whitelistSchema>>({
      resolver: zodResolver(whitelistSchema),
      defaultValues: { email: '', activationCode: '', role: 'pro' }
  });

  const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
      resolver: zodResolver(paymentMethodSchema),
      defaultValues: { name: '', icon: 'Wallet', link: '', isUrl: true, country: 'ALL', enabled: true }
  });

  const themeForm = useForm<z.infer<typeof themeSchema>>({
      resolver: zodResolver(themeSchema),
      defaultValues: { primaryColor: '350 72% 51%', primaryColorDark: '350 72% 51%' }
  });

  const notifyForm = useForm<z.infer<typeof notifySchema>>({
      resolver: zodResolver(notifySchema),
      defaultValues: { title: '', description: '' }
  });

  // Handlers
  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          await setDoc(doc(firestore, 'categories', catId), {
              ...values,
              parentId: values.parentId || null,
              order: isNew ? allCategories.length : (editingCategory!.order ?? 0),
              createdAt: isNew ? serverTimestamp() : (editingCategory!.createdAt || serverTimestamp())
          }, { merge: true });
          toast({ title: "تم الحفظ بنجاح" });
          setEditingCategory(null);
          catForm.reset();
      } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const onAddItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !selectedParentId) return;
    try {
      await addDocumentNonBlocking(collection(firestore, 'categories', selectedParentId, 'items'), { 
          ...values, 
          order: currentItems.length, 
          createdAt: serverTimestamp(), 
          status: isAdmin ? 'approved' : 'pending' 
      });
      toast({ title: isAdmin ? "تم النشر بنجاح" : "تم الإرسال للمراجعة" });
      itemForm.reset();
      setIsAddingItem(false);
    } catch (e) { toast({ title: "خطأ في الإضافة", variant: "destructive" }); }
  };

  const onSaveWhitelist = async (values: z.infer<typeof whitelistSchema>) => {
      if (!firestore) return;
      try {
          const email = values.email.toLowerCase();
          await setDoc(doc(firestore, 'whitelist', email), {
              ...values,
              email,
              isActivated: false,
              createdAt: serverTimestamp()
          });
          toast({ title: "تمت إضافة المستخدم بنجاح" });
          setIsAddingWhitelist(false);
          whitelistForm.reset();
      } catch (e) { toast({ title: "خطأ في الإضافة", variant: "destructive" }); }
  };

  const onSavePayment = async (values: z.infer<typeof paymentMethodSchema>) => {
      if (!firestore) return;
      try {
          const id = editingPayment?.id || doc(collection(firestore, 'paymentMethods')).id;
          await setDoc(doc(firestore, 'paymentMethods', id), {
              ...values,
              order: editingPayment ? editingPayment.order : (payments?.length || 0)
          }, { merge: true });
          toast({ title: "تم حفظ وسيلة الدفع" });
          setEditingPayment(null);
          paymentForm.reset();
      } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const onSavePlan = async (values: z.infer<typeof planSchema>) => {
      if (!firestore) return;
      try {
          const planId = editingPlan?.id || doc(collection(firestore, 'pricingPlans')).id;
          const featuresArray = values.features.split(',').map(f => f.trim()).filter(f => f !== "");
          await setDoc(doc(firestore, 'pricingPlans', planId), {
              ...values,
              features: featuresArray,
              order: editingPlan ? editingPlan.order : (plans?.length || 0)
          }, { merge: true });
          toast({ title: "تم حفظ الباقة بنجاح" });
          setEditingPlan(null);
          planForm.reset();
      } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const moveItem = async (list: any[], index: number, direction: 'up' | 'down', path: string[]) => {
      if (!firestore) return;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= list.length) return;
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, ...path, list[index].id), { order: newIndex });
      batch.update(doc(firestore, ...path, list[newIndex].id), { order: index });
      await batch.commit();
  };

  const generateRandomCode = () => {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      whitelistForm.setValue('activationCode', code);
  };

  if (isUserLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-foreground pb-24" dir="rtl">
      
      {/* Horizontal Header Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b shadow-sm">
        <div className="container mx-auto max-w-6xl px-4">
            <div className="flex h-20 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20">
                        <Monitor className="h-5 w-5" />
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-black tracking-tight">إدارة المنصة</h1>
                        <p className="text-[9px] text-muted-foreground font-bold opacity-60">لوحة التحكم</p>
                    </div>
                </div>

                <div className="flex-1 flex justify-center px-4 overflow-hidden">
                    <ScrollArea className="w-full max-w-sm">
                        <nav className="flex items-center gap-1 bg-secondary/50 p-1 rounded-2xl border whitespace-nowrap">
                            {[
                                { id: 'content', label: 'المحتوى', icon: Layers },
                                { id: 'plans', label: 'الباقات', icon: CreditCard },
                                { id: 'settings', label: 'الإعدادات', icon: Settings },
                            ].map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => { setActiveTool(tool.id as any); setSelectedParentId(null); }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all",
                                        activeTool === tool.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                                    )}
                                >
                                    <tool.icon className="h-3.5 w-3.5" />
                                    {tool.label}
                                </button>
                            ))}
                        </nav>
                        <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>
                </div>

                <Button variant="ghost" size="sm" className="rounded-xl font-black gap-2 text-[10px]" onClick={() => router.push('/home')}>
                    الموقع <ArrowRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        
        {/* Tab 1: Content Management (Hierarchy) */}
        {activeTool === 'content' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {selectedParentId && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedParentId(null)}>
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            )}
                            <h2 className="text-2xl font-black">{selectedParentId ? currentCategory?.name : 'إدارة المحتوى'}</h2>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">تحكم في الأقسام والمنشورات.</p>
                    </div>

                    <div className="flex gap-2">
                        <Dialog open={!!editingCategory} onOpenChange={(o) => !o && setEditingCategory(null)}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="rounded-2xl font-black px-6 shadow-xl shadow-primary/20" onClick={() => {
                                    catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, parentId: selectedParentId });
                                    setEditingCategory({ id: '' } as any);
                                }}>
                                    <Plus className="ml-2 h-5 w-5" /> {selectedParentId ? 'قسم فرعي' : 'قسم رئيسي'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black">إعدادات القسم</DialogTitle>
                                </DialogHeader>
                                <Form {...catForm}>
                                    <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-5 pt-4">
                                        <FormField 
                                            control={catForm.control} 
                                            name="name" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black text-xs">اسم القسم</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-12 rounded-xl" />
                                                    </FormControl>
                                                </FormItem>
                                            )} 
                                        />
                                        <FormField 
                                            control={catForm.control} 
                                            name="fileTypes" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black text-xs flex items-center gap-2">
                                                        <FileCode className="h-4 w-4 text-primary" /> صيغ الملفات (اختياري)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="مثل: PSD, AI" className="h-12 rounded-xl" />
                                                    </FormControl>
                                                </FormItem>
                                            )} 
                                        />
                                        <FormField 
                                            control={catForm.control} 
                                            name="displayStyle" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black text-xs">نمط العرض</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-12 rounded-xl">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="style1">تحميل (Style 1)</SelectItem>
                                                            <SelectItem value="style2">نمط بديل (Style 2)</SelectItem>
                                                            <SelectItem value="style3">برومبت (Style 3)</SelectItem>
                                                            <SelectItem value="style4">فيديو (Style 4)</SelectItem>
                                                            <SelectItem value="style5">معرض (Style 5)</SelectItem>
                                                            <SelectItem value="style6">موقع (Style 6)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} 
                                        />
                                        <div className="p-4 bg-muted/50 rounded-2xl flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black">وضع الصيانة</p>
                                                <p className="text-[10px] text-muted-foreground">يخفي القسم عن المستخدمين</p>
                                            </div>
                                            <FormField 
                                                control={catForm.control} 
                                                name="isUnderMaintenance" 
                                                render={({ field }) => (
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                )} 
                                            />
                                        </div>
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black">حفظ التغييرات</Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>

                        {selectedParentId && (
                            <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                                <DialogTrigger asChild>
                                    <Button size="lg" variant="outline" className="rounded-2xl font-black px-6 border-2">
                                        <Send className="ml-2 h-5 w-5" /> منشور جديد
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black">نشر محتوى</DialogTitle>
                                    </DialogHeader>
                                    <Form {...itemForm}>
                                        <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-4 pt-4">
                                            <FormField 
                                                control={itemForm.control} 
                                                name="title" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">العنوان</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-12 rounded-xl" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            <FormField 
                                                control={itemForm.control} 
                                                name="imageUrl" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">رابط الصورة</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-12 rounded-xl text-left" dir="ltr" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            {currentCategory?.displayStyle === 'style3' && (
                                                <FormField 
                                                    control={itemForm.control} 
                                                    name="prompt" 
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-black">البرومبت</FormLabel>
                                                            <FormControl>
                                                                <Textarea {...field} className="rounded-xl font-mono text-xs" dir="ltr" />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} 
                                                />
                                            )}
                                            <FormField 
                                                control={itemForm.control} 
                                                name="downloadUrl" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">الرابط (تحميل/زيارة)</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-12 rounded-xl text-left" dir="ltr" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            
                                            <div className="flex gap-4 pt-2">
                                                <FormField 
                                                    control={itemForm.control} 
                                                    name="visibility" 
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormLabel className="text-xs font-black">الوصول</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-11 rounded-xl">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="public">مجاني</SelectItem>
                                                                    <SelectItem value="pro">برو</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} 
                                                />
                                                <FormField 
                                                    control={itemForm.control} 
                                                    name="isNew" 
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col justify-end p-2 border rounded-xl bg-muted/30">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black">جديد</span>
                                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                            </div>
                                                        </FormItem>
                                                    )} 
                                                />
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-4">نشر الآن</Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {/* Categories Grid or Items List */}
                {!selectedParentId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainCategories.map((cat, idx) => (
                            <Card key={cat.id} className="rounded-[2.5rem] border-none shadow-xl shadow-gray-200/50 overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                <CardHeader className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
                                    <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl" />
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <CardTitle className="text-xl font-black">{cat.name}</CardTitle>
                                            <Badge className="mt-2 bg-white/20 text-white border-none font-bold uppercase text-[9px]">{cat.displayStyle}</Badge>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); moveItem(mainCategories, idx, 'up', ['categories']); }} disabled={idx === 0}>
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); moveItem(mainCategories, idx, 'down', ['categories']); }} disabled={idx === mainCategories.length - 1}>
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardFooter className="p-4 bg-muted/30 flex gap-2">
                                    <Button className="flex-1 rounded-xl font-black h-11 text-xs" onClick={() => setSelectedParentId(cat.id)}>
                                        إدارة القسم <ChevronLeft className="mr-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-primary hover:bg-primary/10" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    {isAdmin && (
                                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => confirm("حذف القسم؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6">
                            <h3 className="font-black text-sm flex items-center gap-2 text-primary px-2">
                                <Layers className="h-4 w-4" /> الأقسام الفرعية
                            </h3>
                            <div className="space-y-3">
                                {subCategories.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed opacity-40">
                                        <p className="text-xs font-bold">لا توجد أقسام فرعية</p>
                                    </div>
                                ) : (
                                    subCategories.map((sub) => (
                                        <div key={sub.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border group">
                                            <span className="font-black text-sm">{sub.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingCategory(sub); catForm.reset(sub); }}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', sub.id))}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="lg:col-span-8 space-y-6">
                            <h3 className="font-black text-sm flex items-center gap-2 text-primary px-2">
                                <Send className="h-4 w-4" /> المحتوى
                            </h3>
                            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                                <ScrollArea className="h-[600px]">
                                    {currentItems.length === 0 ? (
                                        <div className="text-center py-32 opacity-20">
                                            <Send className="h-16 w-16 mx-auto mb-4" />
                                            <p className="font-black">لم يتم إضافة محتوى بعد</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {currentItems.map((item, idx) => (
                                                <div key={item.id} className="flex items-center gap-4 p-5 hover:bg-secondary/20 transition-colors group">
                                                    <div className="flex flex-col bg-muted/50 rounded-xl overflow-hidden border">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => moveItem(currentItems, idx, 'up', ['categories', selectedParentId!, 'items'])}>
                                                            <ChevronUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === currentItems.length - 1} onClick={() => moveItem(currentItems, idx, 'down', ['categories', selectedParentId!, 'items'])}>
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 relative shrink-0">
                                                        {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover h-full w-full" />}
                                                        {item.visibility === 'pro' && <div className="absolute top-0 right-0 bg-yellow-500 text-white p-0.5 rounded-bl-lg"><Zap className="h-2.5 w-2.5 fill-white" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate">{item.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {item.isNew && <Badge className="bg-green-500 text-white text-[8px] h-4">جديد</Badge>}
                                                            <span className="text-[10px] opacity-40 font-bold uppercase">{item.visibility}</span>
                                                        </div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isAdmin && (
                                                            <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-destructive/10" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedParentId!, 'items', item.id))}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Tab 2: Pricing Plans */}
        {activeTool === 'plans' && (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black">باقات الاشتراك</h2>
                        <p className="text-xs text-muted-foreground font-medium">إدارة خطط الأسعار.</p>
                    </div>
                    <Dialog open={!!editingPlan} onOpenChange={(o) => !o && setEditingPlan(null)}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="rounded-2xl font-black px-6 shadow-xl shadow-primary/20" onClick={() => { 
                                planForm.reset({ name: '', price: '', currency: 'ر.س', features: '', isFeatured: false, enabled: true }); 
                                setEditingPlan({ id: '' } as any); 
                            }}>
                                <Plus className="ml-2 h-5 w-5" /> باقة جديدة
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">إعدادات الباقة</DialogTitle>
                            </DialogHeader>
                            <Form {...planForm}>
                                <form onSubmit={planForm.handleSubmit(onSavePlan)} className="space-y-4 pt-4">
                                    <FormField 
                                        control={planForm.control} 
                                        name="name" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-black text-xs">اسم الباقة</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-12 rounded-xl" />
                                                </FormControl>
                                            </FormItem>
                                        )} 
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField 
                                            control={planForm.control} 
                                            name="price" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black text-xs">السعر</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-12 rounded-xl" />
                                                    </FormControl>
                                                </FormItem>
                                            )} 
                                        />
                                        <FormField 
                                            control={planForm.control} 
                                            name="currency" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black text-xs">العملة</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-12 rounded-xl" />
                                                    </FormControl>
                                                </FormItem>
                                            )} 
                                        />
                                    </div>
                                    <FormField 
                                        control={planForm.control} 
                                        name="features" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-black text-xs">المميزات (مفصولة بفاصلة)</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} className="rounded-xl h-24" />
                                                </FormControl>
                                            </FormItem>
                                        )} 
                                    />
                                    <div className="flex gap-4 p-3 bg-muted rounded-xl">
                                        <FormField 
                                            control={planForm.control} 
                                            name="isFeatured" 
                                            render={({ field }) => (
                                                <FormItem className="flex-1 flex items-center justify-between space-y-0 gap-2">
                                                    <span className="text-xs font-black">باقة مميزة</span>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormItem>
                                            )} 
                                        />
                                        <FormField 
                                            control={planForm.control} 
                                            name="enabled" 
                                            render={({ field }) => (
                                                <FormItem className="flex-1 flex items-center justify-between space-y-0 gap-2">
                                                    <span className="text-xs font-black">مفعلة</span>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormItem>
                                            )} 
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-2">حفظ الباقة</Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans?.map((plan) => (
                        <Card key={plan.id} className={cn("rounded-[2.5rem] border-2 transition-all", plan.isFeatured ? "border-primary shadow-lg" : "border-transparent")}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="font-black">{plan.name}</CardTitle>
                                        <p className="text-3xl font-black text-primary mt-2">{plan.price} <span className="text-sm opacity-60">{plan.currency}</span></p>
                                    </div>
                                    <Badge variant={plan.enabled ? "default" : "secondary"}>{plan.enabled ? 'نشطة' : 'متوقفة'}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs font-medium">
                                            <CheckCircle className="h-3 w-3 text-green-500" /> {f}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="flex gap-2 bg-muted/20 p-4">
                                <Button variant="ghost" size="sm" className="flex-1 font-black rounded-xl h-10" onClick={() => { setEditingPlan(plan); planForm.reset({ ...plan, features: plan.features.join(', ') }); }}>
                                    <Edit2 className="h-4 w-4 ml-2" /> تعديل
                                </Button>
                                {isAdmin && (
                                    <Button variant="ghost" size="sm" className="text-destructive font-black rounded-xl h-10" onClick={() => confirm("حذف الباقة؟") && deleteDocumentNonBlocking(doc(firestore!, 'pricingPlans', plan.id))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {/* Tab 3: General Settings */}
        {activeTool === 'settings' && (
            <div className="animate-in fade-in duration-500">
                <Tabs defaultValue="appearance" className="w-full space-y-8" dir="rtl">
                    <ScrollArea className="w-full">
                        <TabsList className="flex w-full min-w-max bg-white shadow-sm border rounded-2xl p-1 h-14">
                            <TabsTrigger value="appearance" className="rounded-xl font-black text-xs gap-2 px-6">
                                <Palette className="h-4 w-4" /> المظهر
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="rounded-xl font-black text-xs gap-2 px-6">
                                <Bell className="h-4 w-4" /> التنبيهات
                            </TabsTrigger>
                            <TabsTrigger value="links" className="rounded-xl font-black text-xs gap-2 px-6">
                                <Share2 className="h-4 w-4" /> الروابط
                            </TabsTrigger>
                            <TabsTrigger value="users" className="rounded-xl font-black text-xs gap-2 px-6">
                                <Users className="h-4 w-4" /> المستخدمين
                            </TabsTrigger>
                            <TabsTrigger value="payments" className="rounded-xl font-black text-xs gap-2 px-6">
                                <Wallet className="h-4 w-4" /> طرق الدفع
                            </TabsTrigger>
                        </TabsList>
                        <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>

                    <TabsContent value="appearance">
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                            <CardHeader className="px-0">
                                <CardTitle className="flex items-center gap-3">
                                    <Palette className="h-6 w-6 text-primary" /> ألوان الموقع
                                </CardTitle>
                            </CardHeader>
                            <Form {...themeForm}>
                                <form onSubmit={themeForm.handleSubmit(async (v) => { 
                                    await setDoc(doc(firestore!, 'appConfig', 'theme'), v, {merge:true}); 
                                    toast({title:"تم الحفظ"}); 
                                })} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FormField 
                                            control={themeForm.control} 
                                            name="primaryColor" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black">اللون الأساسي (الفاتح)</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Input {...field} className="font-mono text-left" dir="ltr" />
                                                            <div className="h-10 w-10 rounded-xl border shrink-0 shadow-sm" style={{ backgroundColor: `hsl(${field.value})` }} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )} 
                                        />
                                        <FormField 
                                            control={themeForm.control} 
                                            name="primaryColorDark" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-black">اللون الأساسي (الليلي)</FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2">
                                                            <Input {...field} className="font-mono text-left" dir="ltr" />
                                                            <div className="h-10 w-10 rounded-xl border bg-black shrink-0 shadow-sm" style={{ backgroundColor: `hsl(${field.value})` }} />
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )} 
                                        />
                                    </div>
                                    <Button type="submit" className="h-14 px-8 rounded-2xl font-black">حفظ الألوان</Button>
                                </form>
                            </Form>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                            <CardHeader className="px-0">
                                <CardTitle className="flex items-center gap-3">
                                    <Bell className="h-6 w-6 text-primary" /> إرسال إشعار
                                </CardTitle>
                            </CardHeader>
                            <Form {...notifyForm}>
                                <form onSubmit={notifyForm.handleSubmit(async (v) => { 
                                    await addDocumentNonBlocking(collection(firestore!, 'notifications'), {...v, createdAt:serverTimestamp()}); 
                                    toast({title:"تم الإرسال"}); 
                                    notifyForm.reset(); 
                                })} className="space-y-4">
                                    <FormField 
                                        control={notifyForm.control} 
                                        name="title" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-black">العنوان</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-12 rounded-xl" />
                                                </FormControl>
                                            </FormItem>
                                        )} 
                                    />
                                    <FormField 
                                        control={notifyForm.control} 
                                        name="description" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-black">النص</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} className="rounded-xl h-24" />
                                                </FormControl>
                                            </FormItem>
                                        )} 
                                    />
                                    <Button type="submit" className="h-14 px-8 rounded-2xl font-black mt-2">إرسال الآن</Button>
                                </form>
                            </Form>
                        </Card>
                    </TabsContent>

                    <TabsContent value="links">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SettingsLinkCard title="رابط طلب تصميم" icon={Brush} path="appConfig/requestDesign" />
                            <SettingsLinkCard title="رابط مشاركة التطبيق" icon={Share2} path="appConfig/shareLink" />
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg px-2">إدارة صلاحيات المستخدمين</h3>
                            <Dialog open={isAddingWhitelist} onOpenChange={setIsAddingWhitelist}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl font-black">
                                        <UserPlus className="ml-2 h-4 w-4" /> إضافة مستخدم
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="font-black">إضافة مستخدم وتحديد صلاحياته</DialogTitle>
                                    </DialogHeader>
                                    <Form {...whitelistForm}>
                                        <form onSubmit={whitelistForm.handleSubmit(onSaveWhitelist)} className="space-y-4 pt-4">
                                            <FormField 
                                                control={whitelistForm.control} 
                                                name="email" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">البريد الإلكتروني</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="text-left h-12 rounded-xl" dir="ltr" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            
                                            <FormField 
                                                control={whitelistForm.control} 
                                                name="role" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">الصلاحية</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-12 rounded-xl">
                                                                    <SelectValue placeholder="اختر دور المستخدم" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-xl">
                                                                <SelectItem value="pro">عضو برو (Pro)</SelectItem>
                                                                <SelectItem value="editor">محرر (Editor)</SelectItem>
                                                                <SelectItem value="admin">مدير (Admin)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} 
                                            />

                                            <FormField 
                                                control={whitelistForm.control} 
                                                name="activationCode" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">كود التفعيل</FormLabel>
                                                        <div className="flex gap-2">
                                                            <FormControl>
                                                                <Input {...field} className="text-center font-mono font-black h-12 rounded-xl" dir="ltr" />
                                                            </FormControl>
                                                            <Button type="button" variant="secondary" className="h-12 w-12 shrink-0 rounded-xl" onClick={generateRandomCode}>
                                                                <Key className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </FormItem>
                                                )} 
                                            />
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-2">حفظ وإضافة للملفات</Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                            <ScrollArea className="h-[400px]">
                                <div className="divide-y">
                                    {whitelist?.map((entry) => (
                                        <div key={entry.email} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-lg"><UserCog className="h-5 w-5 text-primary" /></div>
                                                <div>
                                                    <p className="font-black text-sm">{entry.email}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge variant="outline" className="text-[8px] uppercase">{entry.role}</Badge>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Key className="h-3 w-3" /> {entry.activationCode}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={entry.isActivated ? "default" : "outline"} className={entry.isActivated ? "bg-green-500" : ""}>
                                                    {entry.isActivated ? 'مفعل' : 'بانتظار التفعيل'}
                                                </Badge>
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'whitelist', entry.email))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg px-2">طرق الدفع</h3>
                            <Dialog open={!!editingPayment} onOpenChange={(o) => !o && setEditingPayment(null)}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-xl font-black" onClick={() => { 
                                        paymentForm.reset({ name: '', icon: 'Wallet', link: '', isUrl: true, country: 'ALL', enabled: true }); 
                                        setEditingPayment({ id: '' } as any); 
                                    }}>
                                        <Plus className="ml-2 h-4 w-4" /> إضافة وسيلة
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="font-black">إعدادات وسيلة الدفع</DialogTitle>
                                    </DialogHeader>
                                    <Form {...paymentForm}>
                                        <form onSubmit={paymentForm.handleSubmit(onSavePayment)} className="space-y-4 pt-4">
                                            <FormField 
                                                control={paymentForm.control} 
                                                name="name" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">اسم الوسيلة (مثلاً: الراجحي)</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="h-12 rounded-xl" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            <FormField 
                                                control={paymentForm.control} 
                                                name="icon" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">اسم الأيقونة (Lucide)</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Wallet, CreditCard, Send..." className="h-12 rounded-xl" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            <FormField 
                                                control={paymentForm.control} 
                                                name="link" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">الرابط أو رقم الحساب</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} className="text-left h-12 rounded-xl" dir="ltr" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                            <FormField 
                                                control={paymentForm.control} 
                                                name="country" 
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-black">الدولة المستهدفة</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-12 rounded-xl">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-xl">
                                                                <SelectItem value="ALL">الكل (Global)</SelectItem>
                                                                <SelectItem value="SA">السعودية (SA)</SelectItem>
                                                                <SelectItem value="YE">اليمن (YE)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} 
                                            />
                                            <div className="flex gap-4 p-3 bg-muted rounded-xl">
                                                <FormField 
                                                    control={paymentForm.control} 
                                                    name="isUrl" 
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1 flex items-center justify-between gap-2 space-y-0">
                                                            <span className="text-[10px] font-black">رابط خارجي؟</span>
                                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                        </FormItem>
                                                    )} 
                                                />
                                                <FormField 
                                                    control={paymentForm.control} 
                                                    name="enabled" 
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1 flex items-center justify-between gap-2 space-y-0">
                                                            <span className="text-[10px] font-black">مفعلة</span>
                                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                        </FormItem>
                                                    )} 
                                                />
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-2">حفظ وسيلة الدفع</Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {payments?.map((method) => (
                                <Card key={method.id} className="rounded-2xl border-none shadow-md bg-white">
                                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-lg"><Wallet className="h-5 w-5 text-primary" /></div>
                                            <CardTitle className="text-sm font-black">{method.name}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingPayment(method); paymentForm.reset(method); }}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            {isAdmin && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'paymentMethods', method.id))}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-[10px] text-muted-foreground truncate font-mono" dir="ltr">{method.link}</p>
                                        <Badge variant="outline" className="mt-2 text-[8px] uppercase tracking-widest">{method.country}</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        )}

      </main>
    </div>
  );
}

function SettingsLinkCard({ title, icon: Icon, path }: { title: string, icon: any, path: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const docRef = useMemoFirebase(() => firestore ? doc(firestore, ...path.split('/')) : null, [firestore, path]);
    const { data } = useDoc<any>(docRef);
    const [val, setVal] = useState('');
    const [enabled, setEnabled] = useState(false);

    useEffect(() => { 
        if (data) { 
            setVal(data.url || ''); 
            setEnabled(data.enabled || false); 
        } 
    }, [data]);

    const save = async () => {
        if (!firestore) return;
        try {
            await setDoc(doc(firestore, ...path.split('/')), { url: val, enabled }, { merge: true });
            toast({ title: "تم الحفظ بنجاح" });
        } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
    };

    return (
        <Card className="rounded-[2.5rem] p-6 border-none shadow-lg bg-white">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg"><Icon className="h-5 w-5 text-primary" /></div>
                        <span className="font-black">{title}</span>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                </CardTitle>
            </CardHeader>
            <div className="space-y-4">
                <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="أدخل الرابط هنا" className="font-mono text-xs text-left h-11 rounded-xl" dir="ltr" />
                <Button onClick={save} className="w-full rounded-xl font-black h-11">تحديث الإعدادات</Button>
            </div>
        </Card>
    );
}
