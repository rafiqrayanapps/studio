
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Settings, 
    Users, 
    FileText, 
    CheckCircle, 
    Loader2,
    LayoutDashboard,
    ArrowLeft,
    ShieldCheck,
    Layers,
    Menu,
    UserPlus,
    Palette,
    BellRing,
    MousePointer2,
    Gift,
    Bell,
    Send,
    CreditCard,
    AlertTriangle,
    Eye,
    Hammer,
    MonitorSmartphone,
    FileCode,
    ExternalLink,
    Tag,
    DollarSign,
    Check,
    Zap,
    ChevronUp,
    ChevronDown
} from 'lucide-react';

import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import DynamicIcon from '@/components/ui/dynamic-icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { Category, ContentItem, WhitelistEntry, ReferralConfig, ThemeConfig, SubscriptionDialogConfig, RequestDesignConfig, Notification, PaymentMethod, PricingPlan } from '@/lib/definitions';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';

// Schemas
const itemSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  imageUrl: z.string().url("رابط الصورة غير صالح"),
  displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6']).default('style1'),
  downloadUrl: z.string().optional(),
  prompt: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().optional(),
  visibility: z.enum(['public', 'pro']),
  order: z.number().default(0),
  isNew: z.boolean().default(false),
});

const categorySchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6']),
    visibility: z.enum(['public', 'pro']),
    order: z.number().default(0),
    isUnderMaintenance: z.boolean().default(false),
    fileTypes: z.string().optional(),
});

const userWhitelistSchema = z.object({
    email: z.string().email("البريد غير صحيح"),
    role: z.enum(['admin', 'editor', 'pro']),
    activationCode: z.string().optional(),
});

const notificationSchema = z.object({
    title: z.string().min(2, "العنوان مطلوب"),
    description: z.string().min(5, "الوصف مطلوب"),
});

const paymentMethodSchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    icon: z.string().min(2, "اسم الأيقونة مطلوب"),
    link: z.string().min(1, "الرابط أو النص مطلوب"),
    isUrl: z.boolean().default(true),
    country: z.string().default('ALL'),
    order: z.number().default(0),
    enabled: z.boolean().default(true),
});

const pricingPlanSchema = z.object({
    name: z.string().min(2, "اسم الباقة مطلوب"),
    price: z.string().min(1, "السعر مطلوب"),
    currency: z.string().default('ر.س'),
    frequency: z.string().optional(),
    description: z.string().optional(),
    features: z.string().describe("المميزات (افصل بينها بفاصلة)"),
    isFeatured: z.boolean().default(false),
    order: z.number().default(0),
    enabled: z.boolean().default(true),
    link: z.string().optional(),
});

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Queries
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: whitelist } = useCollection<WhitelistEntry>(whitelistQuery);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !selectedCategoryId) return null;
      return query(collection(firestore, 'categories', selectedCategoryId, 'items'), orderBy('order', 'asc'));
  }, [firestore, selectedCategoryId]);
  const { data: currentItems, isLoading: isLoadingItems } = useCollection<ContentItem>(itemsQuery);

  const notificationsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'paymentMethods'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: paymentMethods } = useCollection<PaymentMethod>(paymentsQuery);

  const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: pricingPlans } = useCollection<PricingPlan>(plansQuery);

  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  // Config Data
  const themeConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'theme') : null, [firestore]);
  const { data: themeConfig } = useDoc<ThemeConfig>(themeConfigRef);

  const subDialogRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'subscriptionDialog') : null, [firestore]);
  const { data: subDialogConfig } = useDoc<SubscriptionDialogConfig>(subDialogRef);

  const reqDesignRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'requestDesign') : null, [firestore]);
  const { data: reqDesignConfig } = useDoc<RequestDesignConfig>(reqDesignRef);

  const refConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(refConfigRef);

  // Forms
  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: '', imageUrl: '', displayStyle: 'style1', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', visibility: 'public', order: 0, isNew: false }
  });

  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', order: 0, isUnderMaintenance: false, fileTypes: '' }
  });

  const userForm = useForm<z.infer<typeof userWhitelistSchema>>({
      resolver: zodResolver(userWhitelistSchema),
      defaultValues: { email: '', role: 'pro', activationCode: '' }
  });

  const notifForm = useForm<z.infer<typeof notificationSchema>>({
      resolver: zodResolver(notificationSchema),
      defaultValues: { title: '', description: '' }
  });

  const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
      resolver: zodResolver(paymentMethodSchema),
      defaultValues: { name: '', icon: 'CreditCard', link: '', isUrl: true, country: 'ALL', order: 0, enabled: true }
  });

  const planForm = useForm<z.infer<typeof pricingPlanSchema>>({
      resolver: zodResolver(pricingPlanSchema),
      defaultValues: { name: '', price: '', currency: 'ر.س', frequency: '', description: '', features: '', isFeatured: false, order: 0, enabled: true, link: '' }
  });

  useEffect(() => {
    async function fetchPendingItems() {
      if (!firestore || !isAdmin) return;
      setIsLoadingReview(true);
      const allPending: any[] = [];
      if (categories) {
        for (const cat of categories) {
          const q = query(collection(firestore, 'categories', cat.id, 'items'), where('status', '==', 'pending'));
          const snap = await getDocs(q);
          snap.forEach(doc => allPending.push({ ...doc.data(), id: doc.id, categoryId: cat.id }));
        }
      }
      setReviewItems(allPending);
      setIsLoadingReview(false);
    }
    if (activeTab === 'review' && isAdmin) fetchPendingItems();
  }, [firestore, isAdmin, categories, activeTab]);

  // Handlers
  const onAddItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !selectedCategoryId) return;
    try {
      const nextOrder = (currentItems?.length || 0) > 0 ? Math.max(...currentItems!.map(i => i.order || 0)) + 1 : 0;
      const itemData = { ...values, order: nextOrder, createdAt: serverTimestamp(), status: isAdmin ? 'approved' : 'pending' };
      await addDocumentNonBlocking(collection(firestore, 'categories', selectedCategoryId, 'items'), itemData);
      toast({ title: isAdmin ? "تمت إضافة المحتوى بنجاح" : "تم إرسال المحتوى للمراجعة" });
      itemForm.reset({ ...itemForm.getValues(), title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', isNew: false });
    } catch (e) {
      toast({ title: "فشل في إضافة المحتوى", variant: "destructive" });
    }
  };

  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingCategory?.id || editingCategory.id === '';
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory.id;
          const finalOrder = isNew ? (categories?.length || 0) : values.order;

          await setDoc(doc(firestore, 'categories', catId), {
              ...values,
              order: finalOrder,
              parentId: null,
              createdAt: !isNew ? editingCategory.createdAt : serverTimestamp()
          }, { merge: true });
          toast({ title: "تم حفظ القسم بنجاح" });
          setEditingCategory(null);
      } catch (e) {
          toast({ title: "فشل حفظ القسم", variant: "destructive" });
      }
  };

  const moveItemInFirestore = async (list: any[], index: number, direction: 'up' | 'down', path: string[]) => {
      if (!firestore) return;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= list.length) return;

      const item1 = list[index];
      const item2 = list[newIndex];

      const batch = writeBatch(firestore);
      const ref1 = doc(firestore, ...path, item1.id);
      const ref2 = doc(firestore, ...path, item2.id);

      // Swap orders
      batch.update(ref1, { order: newIndex });
      batch.update(ref2, { order: index });

      try {
          await batch.commit();
          toast({ title: "تم تحديث الترتيب" });
      } catch (e) {
          toast({ title: "فشل الترتيب", variant: "destructive" });
      }
  };

  const onUpdatePlan = async (values: z.infer<typeof pricingPlanSchema>) => {
      if (!firestore) return;
      try {
          const planId = (editingPlan?.id && editingPlan.id !== '') ? editingPlan.id : doc(collection(firestore, 'pricingPlans')).id;
          const featuresArray = values.features.split(',').map(f => f.trim()).filter(f => f !== '');
          
          await setDoc(doc(firestore, 'pricingPlans', planId), {
              ...values,
              features: featuresArray
          }, { merge: true });
          
          toast({ title: "تم حفظ الباقة بنجاح" });
          setEditingPlan(null);
      } catch (e) {
          toast({ title: "فشل حفظ الباقة", variant: "destructive" });
      }
  };

  const toggleMaintenance = async (categoryId: string, currentState: boolean) => {
      if (!firestore) return;
      try {
          await updateDocumentNonBlocking(doc(firestore, 'categories', categoryId), {
              isUnderMaintenance: !currentState
          });
          toast({ 
              title: !currentState ? "تم تفعيل وضع الصيانة" : "تم إلغاء وضع الصيانة",
              description: "تم تحديث حالة القسم فوراً."
          });
      } catch (e) {
          toast({ title: "فشل تحديث وضع الصيانة", variant: "destructive" });
      }
  };

  const onUpdatePayment = async (values: z.infer<typeof paymentMethodSchema>) => {
      if (!firestore) return;
      try {
          const methodId = (editingPayment?.id && editingPayment.id !== '') ? editingPayment.id : doc(collection(firestore, 'paymentMethods')).id;
          await setDoc(doc(firestore, 'paymentMethods', methodId), values, { merge: true });
          toast({ title: "تم حفظ طريقة الدفع" });
          setEditingPayment(null);
      } catch (e) {
          toast({ title: "فشل الحفظ", variant: "destructive" });
      }
  };

  const onAddUser = async (values: z.infer<typeof userWhitelistSchema>) => {
      if (!firestore) return;
      try {
          const email = values.email.toLowerCase().trim();
          const activationCode = values.role === 'pro' 
            ? (values.activationCode || `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)
            : '';

          await setDoc(doc(firestore, 'whitelist', email), {
              email,
              role: values.role,
              activationCode,
              isActivated: false,
              createdAt: serverTimestamp(),
          });

          toast({ title: "تمت إضافة المستخدم بنجاح" });
          userForm.reset();
          setIsAddUserOpen(false);
      } catch (e) {
          toast({ title: "فشل إضافة المستخدم", variant: "destructive" });
      }
  };

  const onSendNotification = async (values: z.infer<typeof notificationSchema>) => {
      if (!firestore) return;
      try {
          await addDocumentNonBlocking(collection(firestore, 'notifications'), {
              ...values,
              createdAt: serverTimestamp()
          });
          toast({ title: "تم إرسال الإشعار بنجاح" });
          notifForm.reset();
      } catch (e) {
          toast({ title: "فشل إرسال الإشعار", variant: "destructive" });
      }
  };

  const updateConfig = async (collectionName: string, data: any) => {
      if (!firestore) return;
      try {
          await setDoc(doc(firestore, 'appConfig', collectionName), data, { merge: true });
          toast({ title: "تم تحديث الإعدادات بنجاح" });
      } catch (e) {
          toast({ title: "فشل التحديث", variant: "destructive" });
      }
  };

  const menuItems = [
    { id: 'categories', label: 'الأقسام والصيانة', icon: Layers },
    { id: 'items', label: 'إدارة المحتوى', icon: Plus },
    ...(isAdmin ? [
        { id: 'plans', label: 'باقات الاشتراك', icon: Tag },
        { id: 'review', label: 'طلبات المراجعة', icon: ShieldCheck, badge: reviewItems.length },
        { id: 'notifications', label: 'الإشعارات العامة', icon: Bell },
        { id: 'payments', label: 'طرق الدفع', icon: CreditCard },
        { id: 'users', label: 'المستخدمين', icon: Users },
        { id: 'settings', label: 'إعدادات النظام', icon: Settings }
    ] : [])
  ];

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-card border-l sticky top-0 h-screen shadow-xl z-50">
        <div className="p-8 border-b flex flex-col items-center gap-3">
            <div className="bg-primary text-primary-foreground p-4 rounded-[2rem] shadow-2xl shadow-primary/20 rotate-3"><LayoutDashboard className="h-10 w-10" /></div>
            <div className="text-center">
                <h1 className="font-black text-2xl tracking-tighter">لوحة التحكم</h1>
                <Badge variant="secondary" className="mt-1 rounded-full px-4">{isAdmin ? "مدير النظام" : "محرر محتوى"}</Badge>
            </div>
        </div>
        <ScrollArea className="flex-1 px-4 py-6">
            <nav className="space-y-2">
                {menuItems.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                    >
                        <item.icon className={`h-5 w-5 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} />
                        <span>{item.label}</span>
                        {item.badge ? <span className="mr-auto bg-destructive text-[10px] px-2 py-0.5 rounded-full text-white animate-pulse">{item.badge}</span> : null}
                    </button>
                ))}
            </nav>
        </ScrollArea>
        <div className="p-6 border-t bg-muted/20">
            <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-bold hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => router.push('/home')}><ArrowLeft className="ml-2 h-4 w-4" /> العودة للتطبيق</Button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-card border-b z-40 px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-xl"><LayoutDashboard className="h-5 w-5" /></div>
              <span className="font-black text-base">الإدارة</span>
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl"><Menu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-[85vw] p-0 border-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>القائمة الرئيسية</SheetTitle>
                    <SheetDescription>روابط التنقل الرئيسية في لوحة التحكم</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col h-full bg-card">
                      <div className="p-8 border-b text-center bg-primary/5">
                          <h1 className="font-black text-xl">قائمة التحكم</h1>
                          <Badge variant="outline" className="mt-2">{isAdmin ? "المدير" : "المحرر"}</Badge>
                      </div>
                      <nav className="flex-1 p-6 space-y-3">
                          {menuItems.map(item => (
                              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                                  <item.icon className="h-5 w-5" /><span>{item.label}</span>
                              </button>
                          ))}
                      </nav>
                      <div className="p-6 border-t"><Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => router.push('/home')}>الرجوع للرئيسية</Button></div>
                  </div>
              </SheetContent>
          </Sheet>
      </div>

      <main className="flex-1 p-4 lg:p-10 pt-20 lg:pt-10 overflow-y-auto">
        <Tabs value={activeTab} className="space-y-8">
            
            {/* Categories & Maintenance */}
            <TabsContent value="categories" className="m-0 space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black tracking-tighter">الأقسام والصيانة</h2>
                        <p className="text-muted-foreground text-sm">تحكم في حالة الأقسام وتفعيل وضع الصيانة الفوري.</p>
                    </div>
                    {isAdmin && <Button size="lg" className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-primary/20" onClick={() => { catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', order: 0, isUnderMaintenance: false, fileTypes: '' }); setEditingCategory({ id: '' } as any); }}><Plus className="ml-2 h-5 w-5" /> إضافة قسم جديد</Button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categories?.map((cat, idx) => (
                        <Card key={cat.id} className={`overflow-hidden border-2 transition-all duration-300 ${cat.isUnderMaintenance ? 'border-orange-500/30 bg-orange-50/10' : 'border-primary/5'}`}>
                            <CardHeader className="p-6 bg-muted/20 flex-row justify-between items-start space-y-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-xl font-black">{cat.name}</CardTitle>
                                        <div className="flex flex-col gap-0.5">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" disabled={idx === 0} onClick={() => moveItemInFirestore(categories, idx, 'up', ['categories'])}>
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10" disabled={idx === (categories?.length || 0) - 1} onClick={() => moveItemInFirestore(categories, idx, 'down', ['categories'])}>
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] font-bold h-5 uppercase">نمط: {cat.displayStyle}</Badge>
                                        <Badge variant={cat.visibility === 'pro' ? 'default' : 'secondary'} className="text-[9px] font-bold h-5">{cat.visibility === 'pro' ? 'برو' : 'عام'}</Badge>
                                        {cat.fileTypes && <Badge className="bg-primary/10 text-primary text-[8px] font-black h-5 border-primary/20">{cat.fileTypes}</Badge>}
                                    </div>
                                </div>
                                <div className="bg-background p-2 rounded-2xl shadow-sm border flex-shrink-0"><MonitorSmartphone className="h-6 w-6 text-primary" /></div>
                            </CardHeader>
                            <CardContent className="p-6 pt-4 border-t bg-card/50">
                                <div className="flex items-center justify-between p-4 bg-background rounded-2xl border shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${cat.isUnderMaintenance ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                            {cat.isUnderMaintenance ? <Hammer className="h-5 w-5 animate-pulse" /> : <CheckCircle className="h-5 w-5" />}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black">وضع الصيانة</p>
                                            <p className="text-[10px] text-muted-foreground">{cat.isUnderMaintenance ? 'القسم مغلق حالياً' : 'القسم متاح للجميع'}</p>
                                        </div>
                                    </div>
                                    <Switch checked={cat.isUnderMaintenance} onCheckedChange={() => toggleMaintenance(cat.id, !!cat.isUnderMaintenance)} />
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 border-t flex gap-2 bg-muted/10">
                                <Button variant="secondary" className="text-xs font-bold flex-1 h-10 rounded-xl" onClick={() => { setSelectedCategoryId(cat.id); setActiveTab('items'); }}><FileText className="ml-2 h-4 w-4" /> إدارة المحتوى</Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-primary rounded-xl hover:bg-primary/10" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                {isAdmin && <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => confirm("حذف القسم وكافة محتوياته؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            {/* Items Management */}
            <TabsContent value="items" className="m-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Add Form */}
                    <Card className="xl:col-span-5 shadow-2xl shadow-primary/5 rounded-[2.5rem] border-none">
                        <CardHeader className="p-8 pb-0"><CardTitle className="text-2xl font-black">إضافة محتوى جديد</CardTitle><CardDescription>املأ البيانات لنشر محتوى جديد في القسم المختار.</CardDescription></CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-black flex items-center gap-2 px-1"><Layers className="h-4 w-4 text-primary" /> القسم المستهدف</label>
                                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                        <SelectTrigger className="h-14 rounded-2xl border-2 focus:ring-primary/20"><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
                                        <SelectContent className="rounded-2xl">{categories?.map(cat => (<SelectItem key={cat.id} value={cat.id} className="font-bold py-3">{cat.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                {selectedCategoryId && (
                                    <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                                        <label className="text-sm font-black flex items-center gap-2 px-1"><Palette className="h-4 w-4 text-primary" /> نمط العرض</label>
                                        <Select value={itemForm.watch('displayStyle')} onValueChange={(val: any) => itemForm.setValue('displayStyle', val)}>
                                            <SelectTrigger className="h-14 rounded-2xl border-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                <SelectItem value="style1" className="font-bold py-3">تحميل (Style 1)</SelectItem>
                                                <SelectItem value="style3" className="font-bold py-3">برومبت (Style 3)</SelectItem>
                                                <SelectItem value="style4" className="font-bold py-3">فيديو (Style 4)</SelectItem>
                                                <SelectItem value="style5" className="font-bold py-3">معرض (Style 5)</SelectItem>
                                                <SelectItem value="style6" className="font-bold py-3">نمط الموقع (Style 6)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {selectedCategoryId ? (
                                <Form {...itemForm}>
                                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-6 pt-6 border-t">
                                        <FormField control={itemForm.control} name="title" render={({ field }) => (<FormItem><FormLabel className="font-black">عنوان المنشور</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" placeholder="مثال: ملحقات فوتوشوب حديثة" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel className="font-black">رابط صورة المعاينة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" placeholder="https://..." /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <div className="bg-muted/30 p-6 rounded-[2rem] space-y-5 border-2 border-dashed border-primary/10">
                                            <p className="text-center text-[10px] font-black text-primary uppercase tracking-widest">خيارات النمط المختار</p>
                                            {itemForm.watch('displayStyle') === 'style1' && <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">رابط التحميل المباشر</FormLabel><FormControl><Input {...field} className="h-11 rounded-xl bg-background" /></FormControl></FormItem>)} />}
                                            {itemForm.watch('displayStyle') === 'style3' && (
                                                <div className="space-y-4">
                                                    <FormField control={itemForm.control} name="prompt" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">نص البرومبت</FormLabel><FormControl><Textarea {...field} className="h-32 rounded-xl bg-background" dir="ltr" /></FormControl></FormItem>)} />
                                                    <FormField control={itemForm.control} name="instructions" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">تعليمات الاستخدام</FormLabel><FormControl><Input {...field} className="h-11 rounded-xl bg-background" /></FormControl></FormItem>)} />
                                                </div>
                                            )}
                                            {itemForm.watch('displayStyle') === 'style4' && <FormField control={itemForm.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">رابط الفيديو (YouTube)</FormLabel><FormControl><Input {...field} className="h-11 rounded-xl bg-background" placeholder="https://youtube.com/..." /></FormControl></FormItem>)} />}
                                            {itemForm.watch('displayStyle') === 'style6' && (
                                                <div className="space-y-4">
                                                    <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">رابط الموقع</FormLabel><FormControl><Input {...field} className="h-11 rounded-xl bg-background" placeholder="https://example.com" /></FormControl></FormItem>)} />
                                                    <FormField control={itemForm.control} name="instructions" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">وصف قصير للموقع</FormLabel><FormControl><Textarea {...field} className="h-20 rounded-xl bg-background" placeholder="اكتب وصفاً جذاباً هنا..." /></FormControl></FormItem>)} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <FormField control={itemForm.control} name="visibility" render={({ field }) => (<FormItem><FormLabel className="font-black">مستوى الظهور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="public">عام (للجميع)</SelectItem><SelectItem value="pro">برو (مشتركين فقط)</SelectItem></SelectContent></Select></FormItem>)} />
                                        </div>

                                        <FormField control={itemForm.control} name="isNew" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm bg-muted/10">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-sm font-black">تمييز كمنشور جديد</FormLabel>
                                                    <FormDescription className="text-[10px]">تظهر شارة "جديد" للمستخدمين على هذا العنصر.</FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )} />

                                        <Button type="submit" className="w-full h-16 text-lg font-black rounded-3xl shadow-xl shadow-primary/20" disabled={itemForm.formState.isSubmitting}>{itemForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (isAdmin ? "نشر المحتوى فوراً" : "إرسال للمراجعة")}</Button>
                                    </form>
                                </Form>
                            ) : (
                                <div className="text-center py-12 bg-muted/20 rounded-[2rem] border-2 border-dashed">
                                    <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                    <p className="text-muted-foreground font-bold">يرجى اختيار القسم المستهدف أولاً</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* List View */}
                    <Card className="xl:col-span-7 shadow-xl rounded-[2.5rem] border-none bg-muted/10 overflow-hidden">
                        <CardHeader className="p-8"><CardTitle className="text-xl font-black">المحتوى الحالي في القسم</CardTitle></CardHeader>
                        <CardContent className="p-8 pt-0">
                            <ScrollArea className="h-[750px] pr-4 -mr-4">
                                <div className="space-y-4">
                                    {isLoadingItems ? <Loader2 className="animate-spin mx-auto mt-20 text-primary" /> : currentItems?.length === 0 ? <p className="text-center py-20 text-muted-foreground font-bold">لا يوجد محتوى في هذا القسم حالياً</p> : currentItems?.map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-4 p-4 bg-card rounded-[1.5rem] border shadow-sm group hover:border-primary/30 transition-all">
                                            <div className="flex flex-col gap-1 pr-2 border-l ml-2">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-primary/10" disabled={idx === 0} onClick={() => moveItemInFirestore(currentItems, idx, 'up', ['categories', selectedCategoryId, 'items'])}>
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-primary/10" disabled={idx === (currentItems?.length || 0) - 1} onClick={() => moveItemInFirestore(currentItems, idx, 'down', ['categories', selectedCategoryId, 'items'])}>
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden border-2 border-muted flex-shrink-0 relative">
                                                {item.imageUrl && <img src={item.imageUrl} className="object-cover h-full w-full" />}
                                                {item.isNew && <div className="absolute inset-0 bg-primary/20 animate-pulse" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-sm truncate">{item.title}</p>
                                                    {item.isNew && <Badge className="bg-green-500 text-white text-[8px] font-black h-4">جديد</Badge>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={item.status === 'pending' ? 'destructive' : 'secondary'} className="text-[8px] font-bold h-4">{item.status === 'pending' ? 'قيد المراجعة' : 'نشط ومفعل'}</Badge>
                                                    <Badge variant="outline" className="text-[8px] font-bold h-4">الترتيب: {idx}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-primary rounded-xl"><Edit2 className="h-4 w-4" /></Button>
                                                {isAdmin && <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive rounded-xl" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedCategoryId, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* Pricing Plans Tab */}
            {isAdmin && (
                <TabsContent value="plans" className="m-0 space-y-8 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black">باقات الاشتراك</h2>
                            <p className="text-muted-foreground text-sm">أضف وتحكم في خطط الاشتراك التي تظهر للمستخدمين.</p>
                        </div>
                        <Button size="lg" className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-primary/20" onClick={() => { planForm.reset({ name: '', price: '', currency: 'ر.س', frequency: '', description: '', features: '', isFeatured: false, order: 0, enabled: true, link: '' }); setEditingPlan({ id: '' } as any); }}>
                            <Plus className="ml-2 h-5 w-5" /> إضافة باقة جديدة
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pricingPlans?.map(plan => (
                            <Card key={plan.id} className={`overflow-hidden border-2 transition-all ${plan.isFeatured ? 'border-primary shadow-xl scale-[1.02]' : 'border-border shadow-sm'}`}>
                                <CardHeader className="p-6 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl font-black">{plan.name}</CardTitle>
                                            <CardDescription className="line-clamp-1">{plan.description}</CardDescription>
                                        </div>
                                        {plan.isFeatured && <Badge className="bg-yellow-500 text-white font-bold">الأكثر تميزاً</Badge>}
                                    </div>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-primary">{plan.price}</span>
                                        <span className="text-sm font-bold text-muted-foreground">{plan.currency}</span>
                                        {plan.frequency && <span className="text-xs text-muted-foreground">{plan.frequency}</span>}
                                    </div>
                                </CardHeader>
                                <CardContent className="px-6 py-4 border-t bg-muted/10">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground">المميزات المدرجة:</p>
                                        <ul className="space-y-1.5">
                                            {plan.features.slice(0, 3).map((feat, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs font-bold">
                                                    <Check className="h-3 w-3 text-green-500" />
                                                    <span className="truncate">{feat}</span>
                                                </li>
                                            ))}
                                            {plan.features.length > 3 && <li className="text-[10px] text-primary font-black">+ {plan.features.length - 3} مميزات أخرى</li>}
                                        </ul>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-3 border-t flex gap-2">
                                    <Button variant="outline" className="flex-1 text-xs font-bold h-10 rounded-xl" onClick={() => { setEditingPlan(plan); planForm.reset({ ...plan, features: plan.features.join(', ') }); }}>
                                        <Edit2 className="ml-2 h-4 w-4" /> تعديل
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => confirm("حذف الباقة؟") && deleteDocumentNonBlocking(doc(firestore!, 'pricingPlans', plan.id))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            )}

            {/* Other Tabs (Review, Notifications, etc.) */}
            {isAdmin && (
                <>
                    <TabsContent value="review" className="space-y-8 m-0 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center"><h2 className="text-3xl font-black">طلبات المراجعة ({reviewItems.length})</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoadingReview ? <Loader2 className="animate-spin mx-auto mt-10" /> : reviewItems.length === 0 ? <p className="col-span-full text-center py-20 bg-muted/20 rounded-[2.5rem] font-bold">كل شيء رائع! لا توجد منشورات بانتظار المراجعة.</p> : reviewItems.map(item => (
                                <Card key={item.id} className="overflow-hidden rounded-[2rem] border-2 shadow-xl">
                                    <div className="aspect-video relative bg-muted group cursor-zoom-in">
                                        {item.imageUrl && <img src={item.imageUrl} className="object-cover w-full h-full" />}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white h-8 w-8" /></div>
                                    </div>
                                    <CardHeader className="p-6"><CardTitle className="text-lg font-black">{item.title}</CardTitle><CardDescription className="font-bold text-xs text-primary">القسم: {categories?.find(c => c.id === item.categoryId)?.name}</CardDescription></CardHeader>
                                    <CardFooter className="p-4 pt-0 gap-2">
                                        <Button className="flex-1 bg-green-600 hover:bg-green-700 h-12 rounded-xl font-bold" onClick={() => updateDocumentNonBlocking(doc(firestore!, 'categories', item.categoryId, 'items', item.id), { status: 'approved' })}><CheckCircle className="ml-2 h-4 w-4" /> قبول</Button>
                                        <Button variant="destructive" className="h-12 rounded-xl font-bold px-6" onClick={() => confirm("رفض وحذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', item.categoryId, 'items', item.id))}>رفض</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-8 m-0 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            <Card className="xl:col-span-7 shadow-xl rounded-[2.5rem]">
                                <CardHeader className="p-8 pb-4"><CardTitle className="text-2xl font-black flex items-center gap-3"><BellRing className="h-7 w-7 text-primary" /> إرسال تنبيه جديد</CardTitle><CardDescription>سيتم إشعار كافة مستخدمي التطبيق فوراً بهذا التنبيه.</CardDescription></CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <Form {...notifForm}>
                                        <form onSubmit={notifForm.handleSubmit(onSendNotification)} className="space-y-6">
                                            <FormField control={notifForm.control} name="title" render={({ field }) => (<FormItem><FormLabel className="font-black">عنوان الإشعار</FormLabel><FormControl><Input {...field} className="h-14 rounded-2xl" placeholder="مثال: تم إضافة قسم جديد للمصممين!" /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={notifForm.control} name="description" render={({ field }) => (<FormItem><FormLabel className="font-black">محتوى الإشعار</FormLabel><FormControl><Textarea {...field} className="h-40 rounded-2xl" placeholder="اكتب تفاصيل الإشعار بوضوح هنا..." /></FormControl><FormMessage /></FormItem>)} />
                                            <Button type="submit" className="w-full h-16 text-lg font-black rounded-3xl" disabled={notifForm.formState.isSubmitting}>{notifForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="ml-2 h-5 w-5" /> إرسال الإشعار الآن</>}</Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                            <Card className="xl:col-span-5 rounded-[2.5rem] bg-muted/10 border-none">
                                <CardHeader className="p-8"><CardTitle className="text-xl font-black">السجل</CardTitle></CardHeader>
                                <CardContent className="p-8 pt-0">
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-4">
                                            {notifications?.map(notif => (
                                                <div key={notif.id} className="p-5 bg-card rounded-2xl border shadow-sm relative group">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'notifications', notif.id))}><Trash2 className="h-4 w-4" /></Button>
                                                    <p className="font-black text-sm pr-6">{notif.title}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{notif.description}</p>
                                                    <p className="text-[9px] text-primary font-bold mt-2">{safeFormatFirebaseTimestamp(notif.createdAt)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-8 m-0 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Theme Settings */}
                            <Card className="rounded-[2.5rem] shadow-lg border-none">
                                <CardHeader className="p-8"><CardTitle className="flex items-center gap-3 font-black"><Palette className="h-6 w-6 text-primary" /> مظهر المنصة</CardTitle><CardDescription>تخصيص الألوان الأساسية للموقع (صيغة HSL)</CardDescription></CardHeader>
                                <CardContent className="p-8 pt-0 space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-black px-1">اللون الأساسي (الوضع الفاتح):</label>
                                        <div className="flex gap-3">
                                            <Input value={themeConfig?.primaryColor || ''} onChange={(e) => updateConfig('theme', { primaryColor: e.target.value })} placeholder="مثال: 350 72% 51%" className="h-12 rounded-xl" />
                                            <div className="w-12 h-12 rounded-xl border-2 shadow-inner flex-shrink-0" style={{ backgroundColor: `hsl(${themeConfig?.primaryColor})` }} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black px-1">اللون الأساسي (الوضع الليلي):</label>
                                        <div className="flex gap-3">
                                            <Input value={themeConfig?.primaryColorDark || ''} onChange={(e) => updateConfig('theme', { primaryColorDark: e.target.value })} placeholder="مثال: 350 72% 51%" className="h-12 rounded-xl" />
                                            <div className="w-12 h-12 rounded-xl border-2 shadow-inner flex-shrink-0" style={{ backgroundColor: `hsl(${themeConfig?.primaryColorDark})` }} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Referral System Settings */}
                            <Card className="rounded-[2.5rem] shadow-lg border-none">
                                <CardHeader className="p-8"><CardTitle className="flex items-center gap-3 font-black"><Gift className="h-6 w-6 text-primary" /> نظام المكافآت</CardTitle><CardDescription>إعداد قواعد النقاط والترقية التلقائية لـ برو.</CardDescription></CardHeader>
                                <CardContent className="p-8 pt-0 grid grid-cols-2 gap-6">
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-tight">نقاط ترقية برو</label><Input type="number" value={refConfig?.pointsForProUpgrade || 500} onChange={(e) => updateConfig('referral', { pointsForProUpgrade: parseInt(e.target.value) })} className="h-12 rounded-xl" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-tight">نقاط كل إحالة</label><Input type="number" value={refConfig?.pointsPerReferral || 50} onChange={(e) => updateConfig('referral', { pointsPerReferral: parseInt(e.target.value) })} className="h-12 rounded-xl" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-tight">نقاط توليد كود</label><Input type="number" value={refConfig?.pointsToGenerateCode || 200} onChange={(e) => updateConfig('referral', { pointsToGenerateCode: parseInt(e.target.value) })} className="h-12 rounded-xl" /></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-tight">نقاط فتح ملف</label><Input type="number" value={refConfig?.pointsPerUnlock || 5} onChange={(e) => updateConfig('referral', { pointsPerUnlock: parseInt(e.target.value) })} className="h-12 rounded-xl" /></div>
                                </CardContent>
                            </Card>

                            {/* Subscription Dialog Settings */}
                            <Card className="rounded-[2.5rem] shadow-lg border-none md:col-span-2">
                                <CardHeader className="p-8"><CardTitle className="flex items-center gap-3 font-black"><BellRing className="h-6 w-6 text-primary" /> نافذة الاشتراك والطلب</CardTitle><CardDescription>التحكم في النافذة المنبثقة وأزرار طلب التصميم.</CardDescription></CardHeader>
                                <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-dashed border-primary/20">
                                            <span className="font-black text-sm">تفعيل النافذة المنبثقة</span>
                                            <Switch checked={subDialogConfig?.enabled || false} onCheckedChange={(val) => updateConfig('subscriptionDialog', { enabled: val })} />
                                        </div>
                                        <div className="space-y-2"><label className="text-xs font-black">العنوان:</label><Input value={subDialogConfig?.title || ''} onChange={(e) => updateConfig('subscriptionDialog', { title: e.target.value })} className="h-12 rounded-xl" /></div>
                                        <div className="space-y-2"><label className="text-xs font-black">الرابط:</label><Input value={subDialogConfig?.link || ''} onChange={(e) => updateConfig('subscriptionDialog', { link: e.target.value })} className="h-12 rounded-xl" /></div>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-dashed border-primary/20">
                                            <span className="font-black text-sm">تفعيل زر "اطلب تصميمك"</span>
                                            <Switch checked={reqDesignConfig?.enabled || false} onCheckedChange={(val) => updateConfig('requestDesign', { enabled: val })} />
                                        </div>
                                        <div className="space-y-2"><label className="text-xs font-black">رابط الطلب (واتساب):</label><Input value={reqDesignConfig?.url || ''} onChange={(e) => updateConfig('requestDesign', { url: e.target.value })} className="h-12 rounded-xl" /></div>
                                        <div className="space-y-2"><label className="text-xs font-black">النص الوصفي للنافذة:</label><Textarea value={subDialogConfig?.description || ''} onChange={(e) => updateConfig('subscriptionDialog', { description: e.target.value })} className="h-24 rounded-xl resize-none" /></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-8 m-0 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center"><h2 className="text-3xl font-black">المستخدمين المعتمدين</h2><Button className="h-14 px-8 rounded-2xl font-black" onClick={() => setIsAddUserOpen(true)}><UserPlus className="ml-2 h-5 w-5" /> إضافة يدوية</Button></div>
                        <Card className="rounded-[2.5rem] shadow-xl overflow-hidden border-none">
                            <Table>
                                <TableHeader className="bg-muted/50"><TableRow><TableHead className="text-right font-black">البريد الإلكتروني</TableHead><TableHead className="text-right font-black">الصلاحية</TableHead><TableHead className="text-right font-black">الحالة</TableHead><TableHead className="text-right font-black">كود التفعيل</TableHead></TableRow></TableHeader>
                                <TableBody>{whitelist?.map(entry => (<TableRow key={entry.email} className="hover:bg-primary/5 transition-colors"><TableCell className="text-right font-bold py-5">{entry.email}</TableCell><TableCell className="text-right"><Badge variant="secondary" className="rounded-full px-3">{entry.role}</Badge></TableCell><TableCell className="text-right">{entry.isActivated ? <Badge className="bg-green-500 rounded-full px-3">نشط</Badge> : <Badge variant="outline" className="rounded-full px-3">في الانتظار</Badge>}</TableCell><TableCell className="text-right font-mono font-black text-primary">{entry.activationCode || '---'}</TableCell></TableRow>))}</TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-8 m-0 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center"><h2 className="text-3xl font-black">طرق الدفع</h2><Button className="h-14 px-8 rounded-2xl font-black shadow-lg" onClick={() => { paymentForm.reset({ name: '', icon: 'CreditCard', link: '', isUrl: true, country: 'ALL', order: 0, enabled: true }); setEditingPayment({ id: '' } as any); }}><Plus className="ml-2 h-5 w-5" /> إضافة طريقة دفع</Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paymentMethods?.map(method => (
                                <Card key={method.id} className="rounded-[2rem] border-2 border-primary/5 shadow-sm overflow-hidden">
                                    <CardHeader className="p-6 pb-4 bg-muted/20 flex-row items-center gap-4 space-y-0">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><DynamicIcon name={method.icon} className="h-7 w-7" /></div>
                                        <div className="flex-1 min-w-0"><CardTitle className="text-lg font-black truncate">{method.name}</CardTitle><div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[8px] font-black h-4 px-2">{method.country}</Badge><Badge variant="secondary" className="text-[8px] font-black h-4 px-2">{method.isUrl ? 'رابط مباشر' : 'نص للنسخ'}</Badge></div></div>
                                        <Switch checked={method.enabled} onCheckedChange={(val) => updateDocumentNonBlocking(doc(firestore!, 'paymentMethods', method.id), { enabled: val })} />
                                    </CardHeader>
                                    <CardFooter className="p-3 border-t bg-muted/5 flex gap-2">
                                        <Button variant="ghost" size="sm" className="flex-1 rounded-xl h-10 font-bold" onClick={() => { setEditingPayment(method); paymentForm.reset(method); }}><Edit2 className="ml-2 h-4 w-4" /> تعديل</Button>
                                        {isAdmin && <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive rounded-xl" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'paymentMethods', method.id))}><Trash2 className="h-4 w-4" /></Button>}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </>
            )}
        </Tabs>
      </main>

      {/* Unified Styled Dialogs */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8">
              <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black">{(editingCategory?.id && editingCategory.id !== '') ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
                  <DialogDescription className="font-bold text-muted-foreground">أدخل بيانات القسم لإدارته في الموقع الرئيسي.</DialogDescription>
              </DialogHeader>
              <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-6">
                      <FormField control={catForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-black">اسم القسم</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <FormField control={catForm.control} name="fileTypes" render={({ field }) => (<FormItem><FormLabel className="font-black flex items-center gap-2"><FileCode className="h-4 w-4 text-primary" /> صيغ الملفات (اختياري)</FormLabel><FormControl><Input {...field} placeholder="مثال: PSD, AI, PNG" className="h-12 rounded-xl" /></FormControl><FormDescription className="text-[10px]">تظهر للمستخدمين في الصفحة الرئيسية.</FormDescription></FormItem>)} />
                      <FormField control={catForm.control} name="displayStyle" render={({ field }) => (<FormItem><FormLabel className="font-black">نمط العرض الافتراضي</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="style1">تحميل (أفقي)</SelectItem><SelectItem value="style3">برومبت (بطاقات)</SelectItem><SelectItem value="style4">فيديو (عرض فيديو)</SelectItem><SelectItem value="style5">معرض (Style 5)</SelectItem><SelectItem value="style6">موقع إلكتروني (Style 6)</SelectItem></Select></FormItem>)} />
                      <div className="grid grid-cols-1 gap-4">
                          <FormField control={catForm.control} name="visibility" render={({ field }) => (<FormItem><FormLabel className="font-black">مستوى الظهور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="public">عام</SelectItem><SelectItem value="pro">برو</SelectItem></Select></FormItem>)} />
                      </div>
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20">حفظ القسم الآن</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8">
              <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-black">{(editingPlan?.id && editingPlan.id !== '') ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
                  <DialogDescription className="font-bold text-muted-foreground">أدخل تفاصيل خطة الاشتراك وأسعارها.</DialogDescription>
              </DialogHeader>
              <Form {...planForm}>
                  <form onSubmit={planForm.handleSubmit(onUpdatePlan)} className="space-y-5">
                      <FormField control={planForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-black">اسم الباقة</FormLabel><FormControl><Input {...field} placeholder="مثال: اشتراك برو السنوي" className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={planForm.control} name="price" render={({ field }) => (<FormItem><FormLabel className="font-black">السعر</FormLabel><FormControl><Input {...field} placeholder="مثال: 99" className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                          <FormField control={planForm.control} name="currency" render={({ field }) => (<FormItem><FormLabel className="font-black">العملة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      </div>
                      <FormField control={planForm.control} name="features" render={({ field }) => (<FormItem><FormLabel className="font-black">المميزات (افصل بفاصلة ,)</FormLabel><FormControl><Textarea {...field} placeholder="تحميل غير محدود, دعم فني, وصول مبكر..." className="h-24 rounded-xl" /></FormControl></FormItem>)} />
                      <FormField control={planForm.control} name="link" render={({ field }) => (<FormItem><FormLabel className="font-black">رابط الدفع الخارجي (اختياري)</FormLabel><FormControl><Input {...field} placeholder="https://..." className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
                          <span className="font-black text-sm">تمييز كباقة مختارة (Featured)</span>
                          <Switch checked={planForm.watch('isFeatured')} onCheckedChange={(val) => planForm.setValue('isFeatured', val)} />
                      </div>
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-14 font-black text-lg rounded-2xl shadow-xl shadow-primary/20">حفظ الباقة</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8">
              <DialogHeader className="mb-6"><DialogTitle className="text-2xl font-black">إعداد طريقة الدفع</DialogTitle><DialogDescription className="font-bold text-muted-foreground">تظهر هذه الطريقة للمستخدمين عند ترقية حساباتهم.</DialogDescription></DialogHeader>
              <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit(onUpdatePayment)} className="space-y-5">
                      <FormField control={paymentForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-black">الاسم</FormLabel><FormControl><Input {...field} placeholder="مثال: PayPal" className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <FormField control={paymentForm.control} name="icon" render={({ field }) => (<FormItem><FormLabel className="font-black">اسم الأيقونة (Lucide)</FormLabel><FormControl><div className="flex gap-3"><Input {...field} placeholder="CreditCard" className="h-12 rounded-xl text-left" dir="ltr" /><div className="w-12 h-12 rounded-xl border flex items-center justify-center bg-muted shadow-inner"><DynamicIcon name={field.value} className="h-6 w-6 text-primary" /></div></div></FormControl></FormItem>)} />
                      <FormField control={paymentForm.control} name="link" render={({ field }) => (<FormItem><FormLabel className="font-black">الرابط أو النص المعروض</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>)} />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={paymentForm.control} name="country" render={({ field }) => (<FormItem><FormLabel className="font-black">الدولة المستهدفة</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="ALL">الكل (Global)</SelectItem><SelectItem value="SA">السعودية (SA)</SelectItem><SelectItem value="YE">اليمن (YE)</SelectItem></Select></FormItem>)} />
                      </div>
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-14 font-black text-lg rounded-2xl shadow-xl shadow-primary/20">تأكيد الإعدادات</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8">
              <DialogHeader className="mb-6"><DialogTitle className="text-2xl font-black">إضافة مستخدم يدوياً</DialogTitle><DialogDescription className="font-bold text-muted-foreground">امنح صلاحيات الوصول والاشتراك للمستخدمين عبر بريدهم.</DialogDescription></DialogHeader>
              <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onAddUser)} className="space-y-6">
                      <FormField control={userForm.control} name="email" render={({ field }) => (<FormItem><FormLabel className="font-black">البريد الإلكتروني</FormLabel><FormControl><Input {...field} placeholder="example@mail.com" className="h-12 rounded-xl" /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={userForm.control} name="role" render={({ field }) => (<FormItem><FormLabel className="font-black">الدور / الصلاحية</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="pro" className="font-bold py-3">عضو برو (Pro)</SelectItem><SelectItem value="editor" className="font-bold py-3">محرر (Editor)</SelectItem><SelectItem value="admin" className="font-bold py-3">مدير (Admin)</SelectItem></Select></FormItem>)} />
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20" disabled={userForm.formState.isSubmitting}>{userForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "إضافة المستخدم الآن"}</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
