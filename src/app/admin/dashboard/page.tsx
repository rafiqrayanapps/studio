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
    FileCode,
    UserPlus,
    Users,
    Key,
    Wallet,
    ShieldCheck,
    UserCog,
    Image as ImageIcon,
    PlusCircle,
    Info,
    Layout,
    ExternalLink,
    Hammer,
    Eye,
    Music,
    Save
} from 'lucide-react';

import { 
    useFirestore, 
    useCollection, 
    useMemoFirebase, 
    addDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    useDoc
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

import type { 
    Category, 
    ContentItem, 
    PricingPlan, 
    WhitelistEntry, 
    PaymentMethod,
    SubscriptionDialogConfig
} from '@/lib/definitions';

// Schemas
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
  isNew: z.boolean().default(false),
});

const categorySchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6', 'style7']).default('style1'),
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
    features: z.string(),
    isFeatured: z.boolean().default(false),
    enabled: z.boolean().default(true),
});

const newUserSchema = z.object({
    displayName: z.string().min(3, "الاسم مطلوب"),
    email: z.string().email("بريد غير صالح"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف"),
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
    defaultValues: { title: '', imageUrl: '', audioUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', appVersion: '', screenshots: '', visibility: 'public', isNew: false }
  });

  const userForm = useForm<z.infer<typeof newUserSchema>>({
      resolver: zodResolver(newUserSchema),
      defaultValues: { displayName: '', email: '', password: '', role: 'pro' }
  });

  const planForm = useForm<z.infer<typeof planSchema>>({
      resolver: zodResolver(planSchema),
      defaultValues: { name: '', price: '', currency: 'ر.س', description: '', features: '', isFeatured: false, enabled: true }
  });

  const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
      resolver: zodResolver(paymentMethodSchema),
      defaultValues: { name: '', icon: 'CreditCard', link: '', isUrl: true, country: 'ALL', enabled: true }
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

  const onSaveItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !selectedParentId) return;
    try {
      const screenshotsArray = values.screenshots ? values.screenshots.split(',').map(s => s.trim()).filter(s => s !== '') : [];
      
      const itemData: any = { 
          ...values,
          screenshots: screenshotsArray,
          updatedAt: serverTimestamp(),
          status: isAdmin ? 'approved' : 'pending' 
      };

      if (editingItem) {
          await setDoc(doc(firestore, 'categories', selectedParentId, 'items', editingItem.id), itemData, { merge: true });
          toast({ title: "تم التحديث بنجاح" });
      } else {
          await addDocumentNonBlocking(collection(firestore, 'categories', selectedParentId, 'items'), { 
              ...itemData,
              order: currentItems.length, 
              createdAt: serverTimestamp(), 
          });
          toast({ title: isAdmin ? "تم النشر بنجاح" : "تم الإرسال للمراجعة" });
      }
      
      itemForm.reset();
      setIsAddingItem(false);
      setEditingItem(null);
    } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const onCreateUser = async (values: z.infer<typeof newUserSchema>) => {
      try {
          const res = await createUserByAdmin(values);
          if (res.success) {
              toast({ title: "تم إنشاء الحساب بنجاح" });
              setIsAddingUser(false);
              userForm.reset();
          } else {
              toast({ title: res.error || "فشل إنشاء الحساب", variant: "destructive" });
          }
      } catch (e) { toast({ title: "خطأ غير متوقع", variant: "destructive" }); }
  };

  const moveItem = async (list: any[], index: number, direction: 'up' | 'down', path: string[]) => {
      if (!firestore) return;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= list.length) return;
      
      try {
          const batch = writeBatch(firestore);
          const docRef1 = doc(firestore, ...path, list[index].id);
          const docRef2 = doc(firestore, ...path, list[newIndex].id);
          
          batch.update(docRef1, { order: newIndex });
          batch.update(docRef2, { order: index });
          
          await batch.commit();
          toast({ title: "تم تحديث الترتيب" });
      } catch (e) {
          toast({ title: "فشل تحديث الترتيب", variant: "destructive" });
      }
  };

  const handleBack = () => {
      setSelectedParentId(currentCategory?.parentId || null);
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
        
        {activeTool === 'content' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {selectedParentId && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleBack}>
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
                                    catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: selectedParentId });
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
                                                        <FileCode className="h-4 w-4 text-primary" /> صيغ الملفات (مثل PSD, AI)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input {...field} className="h-12 rounded-xl" />
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
                                                            <SelectItem value="style1">أفقي (Style 1)</SelectItem>
                                                            <SelectItem value="style2">عمودي (Style 2)</SelectItem>
                                                            <SelectItem value="style3">برومبت (Style 3)</SelectItem>
                                                            <SelectItem value="style4">فيديو (Style 4)</SelectItem>
                                                            <SelectItem value="style5">تطبيقات (Style 5)</SelectItem>
                                                            <SelectItem value="style6">موقع (Style 6)</SelectItem>
                                                            <SelectItem value="style7">صوتيات (Style 7)</SelectItem>
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
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black">حفظ القسم</Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>

                        {selectedParentId && (
                            <Dialog open={isAddingItem} onOpenChange={(open) => {
                                setIsAddingItem(open);
                                if (!open) setEditingItem(null);
                            }}>
                                <DialogTrigger asChild>
                                    <Button size="lg" variant="outline" className="rounded-2xl font-black px-6 border-2">
                                        <Send className="ml-2 h-5 w-5" /> منشور جديد
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black">{editingItem ? 'تعديل منشور' : 'نشر محتوى جديد'}</DialogTitle>
                                    </DialogHeader>
                                    <Form {...itemForm}>
                                        <form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-4 pt-4">
                                            <FormField control={itemForm.control} name="title" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">العنوان</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                            )} />
                                            {currentCategory?.displayStyle !== 'style7' && (
                                                <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-xs font-black">رابط الصورة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}
                                            {currentCategory?.displayStyle === 'style7' && (
                                                <FormField control={itemForm.control} name="audioUrl" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-xs font-black">رابط ملف الصوت (Direct MP3)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}
                                            {currentCategory?.displayStyle === 'style5' && (
                                                <>
                                                    <FormField control={itemForm.control} name="appVersion" render={({ field }) => (
                                                        <FormItem><FormLabel className="text-xs font-black">إصدار التطبيق</FormLabel><FormControl><Input {...field} placeholder="1.0.0" className="h-12 rounded-xl" /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={itemForm.control} name="screenshots" render={({ field }) => (
                                                        <FormItem><FormLabel className="text-xs font-black">صور المعرض (روابط مفصولة بفاصلة)</FormLabel><FormControl><Textarea {...field} className="rounded-xl h-20 text-left" dir="ltr" /></FormControl></FormItem>
                                                    )} />
                                                </>
                                            )}
                                            {currentCategory?.displayStyle === 'style3' && (
                                                <FormField control={itemForm.control} name="prompt" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-xs font-black">نص البرومبت</FormLabel><FormControl><Textarea {...field} className="rounded-xl font-mono text-xs" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}
                                            <FormField control={itemForm.control} name="instructions" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">الوصف / المميزات</FormLabel><FormControl><Textarea {...field} className="rounded-xl h-20" /></FormControl></FormItem>
                                            )} />
                                            <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">رابط التحميل / الزيارة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                            )} />
                                            <div className="flex gap-4 pt-2">
                                                <FormField control={itemForm.control} name="visibility" render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel className="text-xs font-black">الوصول</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent className="rounded-xl"><SelectItem value="public">مجاني</SelectItem><SelectItem value="pro">برو</SelectItem></SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={itemForm.control} name="isNew" render={({ field }) => (
                                                    <FormItem className="flex flex-col justify-end p-2 border rounded-xl bg-muted/30">
                                                        <div className="flex items-center gap-2"><span className="text-[10px] font-black">جديد</span><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-4 shadow-xl shadow-primary/20">
                                                {editingItem ? <><Save className="ml-2 h-5 w-5" /> حفظ التغييرات</> : <><Send className="ml-2 h-5 w-5" /> نشر الآن</>}
                                            </Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {!selectedParentId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainCategories.map((cat, idx) => (
                            <Card key={cat.id} className="rounded-[2.5rem] border-none shadow-xl shadow-gray-200/50 overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                                <CardHeader className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
                                    <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl" />
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-xl font-black">{cat.name}</CardTitle>
                                                {cat.isUnderMaintenance && <Badge className="bg-yellow-500 text-white border-none font-bold text-[8px] flex gap-1"><Hammer className="h-2 w-2" /> تحت الصيانة</Badge>}
                                            </div>
                                            <Badge className="bg-white/20 text-white border-none font-bold text-[9px] uppercase">{cat.displayStyle}</Badge>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => moveItem(mainCategories, idx, 'up', ['categories'])} disabled={idx === 0}>
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => moveItem(mainCategories, idx, 'down', ['categories'])} disabled={idx === mainCategories.length - 1}>
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
                            <h3 className="font-black text-sm flex items-center gap-2 text-primary px-2"><Layers className="h-4 w-4" /> الأقسام الفرعية</h3>
                            <div className="space-y-3">
                                {subCategories.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed opacity-40"><p className="text-xs font-bold">لا توجد أقسام فرعية</p></div>
                                ) : (
                                    subCategories.map((sub, idx) => (
                                        <div key={sub.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border group">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveItem(subCategories, idx, 'up', ['categories'])}><ChevronUp className="h-3 w-3" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === subCategories.length - 1} onClick={() => moveItem(subCategories, idx, 'down', ['categories'])}><ChevronDown className="h-3 w-3" /></Button>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm">{sub.name}</span>
                                                    {sub.isUnderMaintenance && <span className="text-[8px] text-yellow-600 font-bold flex items-center gap-1"><Hammer className="h-2 w-2" /> تحت الصيانة</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedParentId(sub.id)} title="إدارة هذا القسم الفرعي"><Layers className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingCategory(sub); catForm.reset(sub); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                                                {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', sub.id))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="lg:col-span-8 space-y-6">
                            <h3 className="font-black text-sm flex items-center gap-2 text-primary px-2"><Send className="h-4 w-4" /> المحتوى في {currentCategory?.name}</h3>
                            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                                <ScrollArea className="h-[600px]">
                                    {currentItems.length === 0 ? (
                                        <div className="text-center py-32 opacity-20"><Send className="h-16 w-16 mx-auto mb-4" /><p className="font-black">لم يتم إضافة محتوى بعد</p></div>
                                    ) : (
                                        <div className="divide-y">
                                            {currentItems.map((item, idx) => (
                                                <div key={item.id} className="flex items-center gap-4 p-5 hover:bg-secondary/20 transition-colors group">
                                                    <div className="flex flex-col bg-muted/50 rounded-xl overflow-hidden border">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => moveItem(currentItems, idx, 'up', ['categories', selectedParentId!, 'items'])}><ChevronUp className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === currentItems.length - 1} onClick={() => moveItem(currentItems, idx, 'down', ['categories', selectedParentId!, 'items'])}><ChevronDown className="h-4 w-4" /></Button>
                                                    </div>
                                                    <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 relative shrink-0 flex items-center justify-center bg-muted">
                                                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="object-cover h-full w-full" /> : (item.audioUrl ? <Music className="h-6 w-6 text-primary" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />)}
                                                        {item.visibility === 'pro' && <div className="absolute top-0 right-0 bg-yellow-500 text-white p-0.5 rounded-bl-lg"><Zap className="h-2.5 w-2.5 fill-white" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate">{item.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {item.isNew && <Badge className="bg-green-500 text-white text-[8px] h-4">جديد</Badge>}
                                                            <span className="text-[10px] opacity-40 font-bold uppercase">{item.visibility}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="text-primary h-10 w-10" onClick={() => {
                                                            setEditingItem(item);
                                                            itemForm.reset({
                                                                ...item,
                                                                screenshots: item.screenshots?.join(', ') || '',
                                                                imageUrl: item.imageUrl || '',
                                                                audioUrl: item.audioUrl || '',
                                                                downloadUrl: item.downloadUrl || '',
                                                                prompt: item.prompt || '',
                                                                instructions: item.instructions || '',
                                                                videoUrl: item.videoUrl || '',
                                                                appVersion: item.appVersion || ''
                                                            });
                                                            setIsAddingItem(true);
                                                        }}>
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        {isAdmin && <Button variant="ghost" size="icon" className="text-destructive h-10 w-10" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedParentId!, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button>}
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
                                planForm.reset({ name: '', price: '', currency: 'ر.س', description: '', features: '', isFeatured: false, enabled: true }); 
                                setEditingPlan({ id: '' } as any); 
                            }}>
                                <Plus className="ml-2 h-5 w-5" /> باقة جديدة
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                            <DialogHeader><DialogTitle className="text-xl font-black">إعدادات الباقة</DialogTitle></DialogHeader>
                            <Form {...planForm}>
                                <form onSubmit={planForm.handleSubmit(async (v) => {
                                    const id = editingPlan?.id || doc(collection(firestore!, 'pricingPlans')).id;
                                    await setDoc(doc(firestore!, 'pricingPlans', id), { ...v, features: v.features.split(',').map(f => f.trim()), order: editingPlan ? editingPlan.order : (plans?.length || 0) }, { merge: true });
                                    toast({ title: "تم الحفظ" }); setEditingPlan(null);
                                })} className="space-y-4 pt-4">
                                    <FormField control={planForm.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel className="font-black text-xs">اسم الباقة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={planForm.control} name="price" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black text-xs">السعر</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                        )} />
                                        <FormField control={planForm.control} name="currency" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black text-xs">العملة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={planForm.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel className="font-black text-xs">وصف قصير</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                    )} />
                                    <FormField control={planForm.control} name="features" render={({ field }) => (
                                        <FormItem><FormLabel className="font-black text-xs">المميزات (مفصولة بفاصلة)</FormLabel><FormControl><Textarea {...field} className="rounded-xl h-24" /></FormControl></FormItem>
                                    )} />
                                    <div className="flex gap-4 p-3 bg-muted rounded-xl">
                                        <FormField control={planForm.control} name="isFeatured" render={({ field }) => (
                                            <FormItem className="flex-1 flex items-center justify-between space-y-0 gap-2"><span className="text-xs font-black">باقة مميزة</span><Switch checked={field.value} onCheckedChange={field.onChange} /></FormItem>
                                        )} />
                                        <FormField control={planForm.control} name="enabled" render={({ field }) => (
                                            <FormItem className="flex-1 flex items-center justify-between space-y-0 gap-2"><span className="text-xs font-black">مفعلة</span><Switch checked={field.value} onCheckedChange={field.onChange} /></FormItem>
                                        )} />
                                    </div>
                                    <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-2">حفظ الباقة</Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans?.map((plan) => (
                        <Card key={plan.id} className={cn("rounded-[2.5rem] border-2", plan.isFeatured ? "border-primary shadow-lg" : "border-transparent")}>
                            <CardHeader><div className="flex justify-between items-start"><div><CardTitle className="font-black">{plan.name}</CardTitle><p className="text-3xl font-black text-primary mt-2">{plan.price} <span className="text-sm opacity-60">{plan.currency}</span></p></div><Badge variant={plan.enabled ? "default" : "secondary"}>{plan.enabled ? 'نشطة' : 'متوقفة'}</Badge></div></CardHeader>
                            <CardContent><ul className="space-y-2">{plan.features.map((f, i) => (<li key={i} className="flex items-center gap-2 text-xs font-medium"><CheckCircle className="h-3 w-3 text-green-500" /> {f}</li>))}</ul></CardContent>
                            <CardFooter className="flex gap-2 bg-muted/20 p-4"><Button variant="ghost" size="sm" className="flex-1 font-black rounded-xl h-10" onClick={() => { setEditingPlan(plan); planForm.reset({ ...plan, features: plan.features.join(', ') }); }}><Edit2 className="h-4 w-4 ml-2" /> تعديل</Button>{isAdmin && <Button variant="ghost" size="sm" className="text-destructive font-black rounded-xl h-10" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'pricingPlans', plan.id))}><Trash2 className="h-4 w-4" /></Button>}</CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        )}

        {activeTool === 'settings' && (
            <div className="animate-in fade-in duration-500">
                <Tabs defaultValue="appearance" className="w-full space-y-8" dir="rtl">
                    <ScrollArea className="w-full">
                        <TabsList className="flex w-full min-w-max bg-white shadow-sm border rounded-2xl p-1 h-14">
                            <TabsTrigger value="appearance" className="rounded-xl font-black text-xs gap-2 px-6"><Palette className="h-4 w-4" /> المظهر</TabsTrigger>
                            <TabsTrigger value="notifications" className="rounded-xl font-black text-xs gap-2 px-6"><Bell className="h-4 w-4" /> التنبيهات</TabsTrigger>
                            <TabsTrigger value="dialog" className="rounded-xl font-black text-xs gap-2 px-6"><Layout className="h-4 w-4" /> نافذة الاشتراك</TabsTrigger>
                            <TabsTrigger value="users" className="rounded-xl font-black text-xs gap-2 px-6"><Users className="h-4 w-4" /> المستخدمين</TabsTrigger>
                            <TabsTrigger value="payments" className="rounded-xl font-black text-xs gap-2 px-6"><Wallet className="h-4 w-4" /> طرق الدفع</TabsTrigger>
                        </TabsList>
                        <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>

                    <TabsContent value="appearance">
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                            <CardHeader className="px-0"><CardTitle className="flex items-center gap-3"><Palette className="h-6 w-6 text-primary" /> ألوان الموقع</CardTitle></CardHeader>
                            <FormThemeControl />
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                            <CardHeader className="px-0"><CardTitle className="flex items-center gap-3"><Bell className="h-6 w-6 text-primary" /> إرسال إشعار</CardTitle></CardHeader>
                            <FormNotificationControl />
                        </Card>
                    </TabsContent>

                    <TabsContent value="dialog">
                        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
                            <CardHeader className="px-0"><CardTitle className="flex items-center gap-3"><Layout className="h-6 w-6 text-primary" /> نافذة الاشتراك المنبثقة</CardTitle></CardHeader>
                            <FormDialogControl />
                        </Card>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg px-2">إدارة الحسابات</h3>
                            <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                                <DialogTrigger asChild><Button className="rounded-xl font-black"><UserPlus className="ml-2 h-4 w-4" /> إنشاء حساب جديد</Button></DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                    <DialogHeader><DialogTitle className="font-black">إضافة مستخدم (مدير، محرر، برو)</DialogTitle></DialogHeader>
                                    <Form {...userForm}>
                                        <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4 pt-4">
                                            <FormField control={userForm.control} name="displayName" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">الاسم الكامل</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                            )} />
                                            <FormField control={userForm.control} name="email" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">البريد الإلكتروني</FormLabel><FormControl><Input {...field} className="text-left h-12 rounded-xl" dir="ltr" /></FormControl></FormItem>
                                            )} />
                                            <FormField control={userForm.control} name="password" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">كلمة المرور</FormLabel><FormControl><Input {...field} type="password" className="text-left h-12 rounded-xl" dir="ltr" /></FormControl></FormItem>
                                            )} />
                                            <FormField control={userForm.control} name="role" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-black">نوع الحساب</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent className="rounded-xl"><SelectItem value="pro">عضو برو (Pro)</SelectItem><SelectItem value="editor">محرر (Editor)</SelectItem><SelectItem value="admin">مدير (Admin)</SelectItem></SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-2 shadow-xl shadow-primary/20">إنشاء الحساب الآن</Button>
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
                                                    <Badge variant="outline" className="text-[8px] uppercase">{entry.role}</Badge>
                                                </div>
                                            </div>
                                            {isAdmin && entry.role !== 'admin' && (
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'whitelist', entry.email))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-lg px-2">طرق الدفع</h3>
                            <Dialog open={!!editingPayment} onOpenChange={(o) => !o && setEditingPayment(null)}>
                                <DialogTrigger asChild><Button className="rounded-xl font-black" onClick={() => { paymentForm.reset({ name: '', icon: 'CreditCard', link: '', isUrl: true, country: 'ALL', enabled: true }); setEditingPayment({ id: '' } as any); }}><Plus className="ml-2 h-4 w-4" /> إضافة وسيلة</Button></DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                    <DialogHeader><DialogTitle className="font-black">وسيلة دفع جديدة</DialogTitle></DialogHeader>
                                    <Form {...paymentForm}>
                                        <form onSubmit={paymentForm.handleSubmit(async (v) => {
                                            const id = editingPayment?.id || doc(collection(firestore!, 'paymentMethods')).id;
                                            await setDoc(doc(firestore!, 'paymentMethods', id), { ...v, order: editingPayment ? editingPayment.order : (payments?.length || 0) }, { merge: true });
                                            toast({ title: "تم الحفظ" }); setEditingPayment(null);
                                        })} className="space-y-4 pt-4">
                                            <FormField control={paymentForm.control} name="name" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">اسم الوسيلة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                            )} />
                                            <FormField control={paymentForm.control} name="icon" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">الأيقونة (Lucide Icon Name)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl><FormDescription className="text-[9px]">مثل: CreditCard, Wallet, Paypal</FormDescription></FormItem>
                                            )} />
                                            <FormField control={paymentForm.control} name="link" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">الرابط أو رقم الحساب</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                            )} />
                                            <div className="flex gap-4">
                                                <FormField control={paymentForm.control} name="country" render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel className="text-xs font-black">الدولة</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent className="rounded-xl"><SelectItem value="ALL">الكل</SelectItem><SelectItem value="SA">السعودية</SelectItem><SelectItem value="YE">اليمن</SelectItem></SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={paymentForm.control} name="isUrl" render={({ field }) => (
                                                    <FormItem className="flex flex-col justify-end p-2 border rounded-xl bg-muted/30">
                                                        <div className="flex items-center gap-2"><span className="text-[10px] font-black">رابط؟</span><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-4">حفظ الوسيلة</Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {payments?.map((pay) => (
                                <Card key={pay.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-muted p-2 rounded-xl"><Wallet className="h-5 w-5 text-primary" /></div>
                                        <div>
                                            <p className="font-black text-sm">{pay.name}</p>
                                            <Badge variant="outline" className="text-[8px]">{pay.country}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPayment(pay); paymentForm.reset(pay); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                                        {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'paymentMethods', pay.id))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                    </div>
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

function FormThemeControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const themeRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'theme') : null, [firestore]);
    const { data: theme } = useDoc<any>(themeRef);
    const [light, setLight] = useState('350 72% 51%');
    const [dark, setDark] = useState('350 72% 51%');

    useEffect(() => { if (theme) { setLight(theme.primaryColor || '350 72% 51%'); setDark(theme.primaryColorDark || theme.primaryColor || '350 72% 51%'); } }, [theme]);

    const save = async () => {
        await setDoc(themeRef!, { primaryColor: light, primaryColorDark: dark }, { merge: true });
        toast({ title: "تم تحديث الألوان بنجاح" });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="font-black text-xs">اللون الأساسي (الفاتح)</label>
                    <div className="flex gap-2"><Input value={light} onChange={e => setLight(e.target.value)} dir="ltr" /><div className="h-10 w-10 rounded-xl border" style={{ backgroundColor: `hsl(${light})` }} /></div>
                </div>
                <div className="space-y-2">
                    <label className="font-black text-xs">اللون الأساسي (الداكن)</label>
                    <div className="flex gap-2"><Input value={dark} onChange={e => setDark(e.target.value)} dir="ltr" /><div className="h-10 w-10 rounded-xl border bg-black" style={{ backgroundColor: `hsl(${dark})` }} /></div>
                </div>
            </div>
            <Button onClick={save} className="h-14 px-8 rounded-2xl font-black">حفظ الألوان</Button>
        </div>
    );
}

function FormDialogControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const configRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'subscriptionDialog') : null, [firestore]);
    const { data: config } = useDoc<SubscriptionDialogConfig>(configRef);
    const [val, setVal] = useState({ title: '', description: '', link: '', enabled: false });

    useEffect(() => { if (config) setVal(config); }, [config]);

    const save = async () => {
        await setDoc(configRef!, val, { merge: true });
        toast({ title: "تم حفظ إعدادات النافذة" });
    };

    return (
        <div className="space-y-4">
            <Input placeholder="عنوان النافذة" value={val.title} onChange={e => setVal({ ...val, title: e.target.value })} />
            <Textarea placeholder="وصف النافذة" value={val.description} onChange={e => setVal({ ...val, description: e.target.value })} />
            <Input placeholder="رابط زر الاشتراك" value={val.link} onChange={e => setVal({ ...val, link: e.target.value })} dir="ltr" />
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <span className="text-sm font-black">تفعيل النافذة المنبثقة</span>
                <Switch checked={val.enabled} onCheckedChange={e => setVal({ ...val, enabled: e })} />
            </div>
            <Button onClick={save} className="w-full h-14 rounded-2xl font-black">تحديث الإعدادات</Button>
        </div>
    );
}

function FormNotificationControl() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');

    const send = async () => {
        await addDocumentNonBlocking(collection(firestore!, 'notifications'), { title, description: desc, createdAt: serverTimestamp() });
        toast({ title: "تم إرسال الإشعار" });
        setTitle(''); setDesc('');
    };

    return (
        <div className="space-y-4">
            <Input placeholder="عنوان الإشعار" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="نص الإشعار" value={desc} onChange={e => setDesc(e.target.value)} />
            <Button onClick={send} className="h-14 px-8 rounded-2xl font-black">إرسال الآن</Button>
        </div>
    );
}
