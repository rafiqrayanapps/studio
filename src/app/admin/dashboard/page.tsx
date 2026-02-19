'use client';
import { useState, useEffect, useMemo } from 'react';
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
    Gift,
    Bell,
    Send,
    CreditCard,
    AlertTriangle,
    Eye,
    Hammer,
    MonitorSmartphone,
    FileCode,
    Tag,
    Check,
    Zap,
    ChevronUp,
    ChevronDown
} from 'lucide-react';

import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
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
import DynamicIcon from '@/components/ui/dynamic-icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { Category, ContentItem, WhitelistEntry, ReferralConfig, ThemeConfig, Notification, PaymentMethod, PricingPlan } from '@/lib/definitions';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';

const itemSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  imageUrl: z.string().url("رابط الصورة غير صالح"),
  displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6']).default('style1'),
  downloadUrl: z.string().optional(),
  prompt: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().optional(),
  visibility: z.enum(['public', 'pro']),
  isNew: z.boolean().default(false),
});

const categorySchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6']),
    visibility: z.enum(['public', 'pro']),
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
    icon: z.string().min(2, "الأيقونة مطلوبة"),
    link: z.string().min(1, "الرابط أو النص مطلوب"),
    isUrl: z.boolean().default(true),
    country: z.string().default('ALL'),
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

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  const categories = useMemo(() => rawCategories ? [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : null, [rawCategories]);

  const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist')) : null, [firestore]);
  const { data: whitelist } = useCollection<WhitelistEntry>(whitelistQuery);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !selectedCategoryId) return null;
      return query(collection(firestore, 'categories', selectedCategoryId, 'items'));
  }, [firestore, selectedCategoryId]);
  const { data: rawItems, isLoading: isLoadingItems } = useCollection<ContentItem>(itemsQuery);
  const currentItems = useMemo(() => rawItems ? [...rawItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : null, [rawItems]);

  const notificationsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications')) : null, [firestore]);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  const themeConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'theme') : null, [firestore]);
  const { data: themeConfig } = useDoc<ThemeConfig>(themeConfigRef);

  const refConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(refConfigRef);

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: '', imageUrl: '', displayStyle: 'style1', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', visibility: 'public', isNew: false }
  });

  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '' }
  });

  const paymentForm = useForm<z.infer<typeof paymentMethodSchema>>({
      resolver: zodResolver(paymentMethodSchema),
      defaultValues: { name: '', icon: 'CreditCard', link: '', isUrl: true, country: 'ALL', enabled: true }
  });

  const planForm = useForm<z.infer<typeof pricingPlanSchema>>({
      resolver: zodResolver(pricingPlanSchema),
      defaultValues: { name: '', price: '', currency: 'ر.س', frequency: '', description: '', features: '', isFeatured: false, enabled: true, link: '' }
  });

  const onAddItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !selectedCategoryId) return;
    try {
      const nextOrder = (currentItems?.length || 0);
      const itemData = { 
          ...values, 
          order: nextOrder, 
          createdAt: serverTimestamp(), 
          status: isAdmin ? 'approved' : 'pending' 
      };
      await addDocumentNonBlocking(collection(firestore, 'categories', selectedCategoryId, 'items'), itemData);
      toast({ title: isAdmin ? "تم النشر بنجاح" : "بانتظار المراجعة" });
      itemForm.reset();
    } catch (e) {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
    }
  };

  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory.id;
          await setDoc(doc(firestore, 'categories', catId), {
              ...values,
              order: isNew ? (categories?.length || 0) : (editingCategory.order ?? 0),
              parentId: null,
              createdAt: isNew ? serverTimestamp() : editingCategory.createdAt
          }, { merge: true });
          toast({ title: "تم الحفظ" });
          setEditingCategory(null);
      } catch (e) {
          toast({ title: "خطأ في الحفظ", variant: "destructive" });
      }
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

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen bg-secondary/30" dir="rtl">
      <aside className="hidden lg:flex w-72 flex-col bg-card border-l sticky top-0 h-screen shadow-xl z-50">
        <div className="p-8 border-b flex flex-col items-center gap-3">
            <div className="bg-primary text-primary-foreground p-4 rounded-[2rem] shadow-2xl rotate-3">
                <LayoutDashboard className="h-10 w-10" />
            </div>
            <h1 className="font-black text-2xl">لوحة التحكم</h1>
        </div>
        <ScrollArea className="flex-1 px-4 py-6">
            <nav className="space-y-2">
                {[
                    { id: 'categories', label: 'الأقسام والصيانة', icon: Layers },
                    { id: 'items', label: 'إدارة المحتوى', icon: Plus },
                    { id: 'users', label: 'المستخدمين', icon: Users, adminOnly: true },
                    { id: 'settings', label: 'إعدادات النظام', icon: Settings, adminOnly: true }
                ].filter(item => !item.adminOnly || isAdmin).map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-primary/5'}`}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </ScrollArea>
        <div className="p-6 border-t"><Button variant="outline" className="w-full rounded-2xl font-bold" onClick={() => router.push('/home')}>العودة للتطبيق</Button></div>
      </aside>

      <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
        <Tabs value={activeTab} className="space-y-8">
            <TabsContent value="categories" className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black">الأقسام</h2>
                    <Button size="lg" className="rounded-2xl font-black" onClick={() => { catForm.reset(); setEditingCategory({ id: '' } as any); }}>
                        <Plus className="ml-2 h-5 w-5" /> إضافة قسم
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categories?.map((cat, idx) => (
                        <Card key={cat.id} className="overflow-hidden border-2 border-primary/5">
                            <CardHeader className="p-6 bg-muted/20 flex-row justify-between items-start space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-black">{cat.name}</CardTitle>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="text-[10px]">نمط: {cat.displayStyle}</Badge>
                                        {cat.fileTypes && <Badge className="bg-primary/10 text-primary text-[10px]">{cat.fileTypes}</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => moveItem(categories, idx, 'up', ['categories'])}><ChevronUp /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === categories.length - 1} onClick={() => moveItem(categories, idx, 'down', ['categories'])}><ChevronDown /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 border-t flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${cat.isUnderMaintenance ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                        {cat.isUnderMaintenance ? <Hammer className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                    </div>
                                    <p className="text-xs font-black">وضع الصيانة</p>
                                </div>
                                <Switch checked={cat.isUnderMaintenance} onCheckedChange={(val) => updateDocumentNonBlocking(doc(firestore!, 'categories', cat.id), { isUnderMaintenance: val })} />
                            </CardContent>
                            <CardFooter className="p-3 border-t flex gap-2">
                                <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => { setSelectedCategoryId(cat.id); setActiveTab('items'); }}>المحتوى</Button>
                                <Button variant="ghost" size="icon" className="text-primary" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 /></Button>
                                {isAdmin && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 /></Button>}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <Card className="xl:col-span-5 rounded-[2.5rem]">
                        <CardHeader className="p-8 pb-0"><CardTitle className="text-2xl font-black">إضافة محتوى</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-black">القسم المستهدف</label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger className="h-14 rounded-2xl"><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedCategoryId && (
                                <Form {...itemForm}>
                                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-4 pt-4 border-t">
                                        <FormField control={itemForm.control} name="title" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black">العنوان</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                        )} />
                                        <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black">رابط الصورة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                        )} />
                                        <div className="bg-muted/30 p-4 rounded-2xl space-y-4">
                                            <FormField control={itemForm.control} name="displayStyle" render={({ field }) => (
                                                <FormItem><FormLabel className="font-black">النمط</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="style1">تحميل (Style 1)</SelectItem>
                                                            <SelectItem value="style3">برومبت (Style 3)</SelectItem>
                                                            <SelectItem value="style6">موقع (Style 6)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            {itemForm.watch('displayStyle') === 'style3' && (
                                                <FormField control={itemForm.control} name="prompt" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-black">البرومبت</FormLabel><FormControl><Textarea {...field} className="h-24 rounded-xl" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}
                                            <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (
                                                <FormItem><FormLabel className="font-black">الرابط المباشر</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={itemForm.control} name="isNew" render={({ field }) => (
                                            <FormItem className="flex items-center justify-between p-4 border rounded-xl">
                                                <FormLabel className="font-black">منشور جديد</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <Button type="submit" className="w-full h-14 text-lg font-black rounded-2xl" disabled={itemForm.formState.isSubmitting}>نشر الآن</Button>
                                    </form>
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="xl:col-span-7 rounded-[2.5rem] bg-muted/10 overflow-hidden">
                        <CardHeader className="p-8"><CardTitle className="text-xl font-black">المحتوى الحالي</CardTitle></CardHeader>
                        <CardContent className="p-8 pt-0">
                            <ScrollArea className="h-[600px] space-y-4">
                                {currentItems?.map((item, idx) => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border shadow-sm group">
                                        <div className="flex flex-col">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveItem(currentItems, idx, 'up', ['categories', selectedCategoryId, 'items'])}><ChevronUp /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === currentItems.length - 1} onClick={() => moveItem(currentItems, idx, 'down', ['categories', selectedCategoryId, 'items'])}><ChevronDown /></Button>
                                        </div>
                                        <div className="h-12 w-12 rounded-lg overflow-hidden border">{item.imageUrl && <img src={item.imageUrl} className="object-cover h-full w-full" />}</div>
                                        <div className="flex-1"><p className="font-black text-sm">{item.title}</p></div>
                                        {isAdmin && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedCategoryId, 'items', item.id))}><Trash2 /></Button>}
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingCategory} onOpenChange={(o) => !o && setEditingCategory(null)}>
          <DialogContent className="max-w-md rounded-[2rem] p-8" dir="rtl">
              <DialogHeader><DialogTitle className="text-2xl font-black">إعداد القسم</DialogTitle></DialogHeader>
              <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-6">
                      <FormField control={catForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel className="font-black">اسم القسم</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                      )} />
                      <FormField control={catForm.control} name="fileTypes" render={({ field }) => (
                          <FormItem><FormLabel className="font-black">الصيغ (مثلاً: PSD, PNG)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                      )} />
                      <FormField control={catForm.control} name="displayStyle" render={({ field }) => (
                          <FormItem><FormLabel className="font-black">نمط العرض</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="style1">تحميل (أفقي)</SelectItem>
                                <SelectItem value="style3">برومبت (بطاقات)</SelectItem>
                                <SelectItem value="style6">موقع إلكتروني</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                      )} />
                      <DialogFooter><Button type="submit" className="w-full h-14 font-black rounded-xl">حفظ القسم</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
