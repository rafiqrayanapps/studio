
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
    UserMinus,
    Menu,
    UserPlus,
    Save,
    Palette,
    BellRing,
    MousePointer2,
    Gift,
    Bell,
    Send
} from 'lucide-react';

import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

import type { Category, ContentItem, WhitelistEntry, ReferralConfig, ThemeConfig, SubscriptionDialogConfig, RequestDesignConfig, Notification } from '@/lib/definitions';
import { deleteUserAccount } from '@/lib/user-actions';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';

// Schemas
const itemSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  imageUrl: z.string().url("رابط الصورة غير صالح"),
  displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5']).default('style1'),
  downloadUrl: z.string().optional(),
  prompt: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().optional(),
  visibility: z.enum(['public', 'pro']),
  order: z.number().default(0),
});

const categorySchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5']),
    visibility: z.enum(['public', 'pro']),
    order: z.number().default(0),
    isUnderMaintenance: z.boolean().default(false),
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

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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
    defaultValues: { title: '', imageUrl: '', displayStyle: 'style1', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', visibility: 'public', order: 0 }
  });

  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', order: 0, isUnderMaintenance: false }
  });

  const userForm = useForm<z.infer<typeof userWhitelistSchema>>({
      resolver: zodResolver(userWhitelistSchema),
      defaultValues: { email: '', role: 'pro', activationCode: '' }
  });

  const notifForm = useForm<z.infer<typeof notificationSchema>>({
      resolver: zodResolver(notificationSchema),
      defaultValues: { title: '', description: '' }
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
      const itemData = { ...values, createdAt: serverTimestamp(), status: isAdmin ? 'approved' : 'pending' };
      await addDocumentNonBlocking(collection(firestore, 'categories', selectedCategoryId, 'items'), itemData);
      toast({ title: isAdmin ? "تمت إضافة المحتوى بنجاح" : "تم إرسال المحتوى للمراجعة" });
      itemForm.reset({ ...itemForm.getValues(), title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '' });
    } catch (e) {
      toast({ title: "فشل في إضافة المحتوى", variant: "destructive" });
    }
  };

  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const catId = editingCategory?.id || doc(collection(firestore, 'categories')).id;
          await setDoc(doc(firestore, 'categories', catId), {
              ...values,
              parentId: null,
              createdAt: editingCategory?.createdAt || serverTimestamp()
          }, { merge: true });
          toast({ title: "تم حفظ القسم بنجاح" });
          setEditingCategory(null);
      } catch (e) {
          toast({ title: "فشل حفظ القسم", variant: "destructive" });
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
    { id: 'categories', label: 'الأقسام', icon: Layers },
    { id: 'items', label: 'المحتوى', icon: Plus },
    ...(isAdmin ? [
        { id: 'review', label: 'المراجعة', icon: ShieldCheck, badge: reviewItems.length },
        { id: 'notifications', label: 'الإشعارات', icon: Bell },
        { id: 'users', label: 'المستخدمين', icon: Users },
        { id: 'settings', label: 'الإعدادات', icon: Settings }
    ] : [])
  ];

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-card border-l sticky top-0 h-screen">
        <div className="p-6 border-b flex flex-col items-center gap-2">
            <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg"><LayoutDashboard className="h-8 w-8" /></div>
            <h1 className="font-bold text-xl mt-2">لوحة التحكم</h1>
            <Badge variant="secondary">{isAdmin ? "مدير النظام" : "محرر"}</Badge>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'}`}>
                    <item.icon className="h-5 w-5" />
                    <span className="font-bold">{item.label}</span>
                    {item.badge ? <span className="mr-auto bg-destructive text-[10px] px-1.5 py-0.5 rounded-full text-white">{item.badge}</span> : null}
                </button>
            ))}
        </nav>
        <div className="p-4 border-t">
            <Button variant="outline" className="w-full rounded-xl" onClick={() => router.push('/home')}><ArrowLeft className="ml-2 h-4 w-4" /> العودة للتطبيق</Button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-card border-b z-40 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="bg-primary text-primary-foreground p-1.5 rounded-lg"><LayoutDashboard className="h-5 w-5" /></div><span className="font-bold text-sm">لوحة التحكم</span></div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>القائمة الرئيسية</SheetTitle>
                    <SheetDescription>روابط التنقل الرئيسية في لوحة التحكم</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col h-full bg-card">
                      <div className="p-6 border-b text-center"><h1 className="font-bold text-lg">التحكم</h1></div>
                      <nav className="flex-1 p-4 space-y-2">
                          {menuItems.map(item => (
                              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                                  <item.icon className="h-5 w-5" /><span className="font-bold">{item.label}</span>
                              </button>
                          ))}
                      </nav>
                      <div className="p-4 border-t"><Button variant="outline" className="w-full" onClick={() => router.push('/home')}>الرئيسية</Button></div>
                  </div>
              </SheetContent>
          </Sheet>
      </div>

      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
        <Tabs value={activeTab} className="space-y-6">
            
            <TabsContent value="categories" className="m-0 space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-xl lg:text-2xl font-bold">إدارة الأقسام</h2>{isAdmin && <Button size="sm" onClick={() => { catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', order: 0, isUnderMaintenance: false }); setEditingCategory({ id: '' } as any); }}><Plus className="ml-1 h-4 w-4" /> جديد</Button>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories?.map(cat => (
                        <Card key={cat.id} className="overflow-hidden border-2 border-primary/5">
                            <CardHeader className="p-4 bg-muted/30 flex-row justify-between items-start space-y-0">
                                <div><CardTitle className="text-lg">{cat.name}</CardTitle><CardDescription className="text-[10px]">النمط: {cat.displayStyle}</CardDescription></div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant={cat.visibility === 'pro' ? 'default' : 'outline'}>{cat.visibility === 'pro' ? 'برو' : 'عام'}</Badge>
                                    {cat.isUnderMaintenance && <Badge className="bg-orange-500 text-[8px] h-4">صيانة</Badge>}
                                </div>
                            </CardHeader>
                            <CardFooter className="p-2 border-t flex gap-2">
                                <Button variant="ghost" className="text-xs flex-1" onClick={() => { setSelectedCategoryId(cat.id); setActiveTab('items'); }}><FileText className="ml-1 h-3 w-3" /> المحتوى</Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف القسم؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="items" className="m-0 space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Card className="xl:col-span-2">
                        <CardHeader><CardTitle>إضافة محتوى جديد</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground">اختر القسم المستهدف:</label><Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر القسم..." /></SelectTrigger><SelectContent>{categories?.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground">نمط العرض:</label><Select value={itemForm.watch('displayStyle')} onValueChange={(val: any) => itemForm.setValue('displayStyle', val)}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="style1">تحميل (Style 1)</SelectItem><SelectItem value="style3">برومبت (Style 3)</SelectItem><SelectItem value="style4">فيديو (Style 4)</SelectItem><SelectItem value="style5">معرض (Style 5)</SelectItem></SelectContent></Select></div>
                            </div>
                            {selectedCategoryId && (
                                <Form {...itemForm}>
                                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-5 pt-4 border-t">
                                        <FormField control={itemForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>العنوان</FormLabel><FormControl><Input {...field} placeholder="عنوان جذاب للمنشور" /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>رابط الصورة المعاينة</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>)} />
                                        {itemForm.watch('displayStyle') === 'style1' && <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (<FormItem><FormLabel>رابط التحميل المباشر</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />}
                                        {itemForm.watch('displayStyle') === 'style3' && (
                                            <div className="space-y-4">
                                                <FormField control={itemForm.control} name="prompt" render={({ field }) => (<FormItem><FormLabel>نص البرومبت</FormLabel><FormControl><Textarea {...field} className="h-32" dir="ltr" /></FormControl></FormItem>)} />
                                                <FormField control={itemForm.control} name="instructions" render={({ field }) => (<FormItem><FormLabel>تعليمات الاستخدام</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                            </div>
                                        )}
                                        {itemForm.watch('displayStyle') === 'style4' && <FormField control={itemForm.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel>رابط الفيديو</FormLabel><FormControl><Input {...field} placeholder="YouTube URL" /></FormControl></FormItem>)} />}
                                        <div className="flex gap-4"><FormField control={itemForm.control} name="visibility" render={({ field }) => (<FormItem className="flex-1"><FormLabel>الظهور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="public">عام (للجميع)</SelectItem><SelectItem value="pro">برو (للمشتركين)</SelectItem></SelectContent></Select></FormItem>)} /><FormField control={itemForm.control} name="order" render={({ field }) => (<FormItem className="w-24"><FormLabel>الترتيب</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} /></div>
                                        <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={itemForm.formState.isSubmitting}>{itemForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (isAdmin ? "نشر المحتوى فوراً" : "إرسال للمراجعة")}</Button>
                                    </form>
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                    <Card><CardHeader><CardTitle className="text-lg">المحتوى المنشور حالياً</CardTitle></CardHeader><CardContent><ScrollArea className="h-[600px]"><div className="space-y-3">{isLoadingItems ? <Loader2 className="animate-spin mx-auto mt-10" /> : currentItems?.map(item => (<div key={item.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl group"><div className="h-12 w-12 rounded-xl bg-muted overflow-hidden border">{item.imageUrl && <img src={item.imageUrl} className="object-cover h-full w-full" />}</div><div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{item.title}</p><Badge variant={item.status === 'pending' ? 'outline' : 'secondary'} className="text-[8px] h-4 mt-1">{item.status === 'pending' ? 'مراجعة' : 'نشط'}</Badge></div><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedCategoryId, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button></div>))}</div></ScrollArea></CardContent></Card>
                </div>
            </TabsContent>

            {isAdmin && (
                <TabsContent value="notifications" className="space-y-6 m-0">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <Card className="xl:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> إرسال تنبيه جديد</CardTitle>
                                <CardDescription>سيظهر هذا التنبيه لجميع مستخدمي التطبيق فوراً.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...notifForm}>
                                    <form onSubmit={notifForm.handleSubmit(onSendNotification)} className="space-y-4">
                                        <FormField control={notifForm.control} name="title" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>عنوان التنبيه</FormLabel>
                                                <FormControl><Input {...field} placeholder="مثال: تم إضافة ملحقات جديدة!" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={notifForm.control} name="description" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>نص التنبيه</FormLabel>
                                                <FormControl><Textarea {...field} placeholder="اكتب تفاصيل التنبيه هنا..." className="h-32" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <Button type="submit" className="w-full h-12" disabled={notifForm.formState.isSubmitting}>
                                            {notifForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="ml-2 h-4 w-4" /> إرسال التنبيه الآن</>}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">الإشعارات السابقة</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <div className="space-y-3">
                                        {notifications?.map(notif => (
                                            <div key={notif.id} className="p-3 bg-muted/40 rounded-xl space-y-1 relative group">
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive absolute top-2 left-2 opacity-0 group-hover:opacity-100" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'notifications', notif.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                <p className="text-sm font-bold pl-6">{notif.title}</p>
                                                <p className="text-[10px] text-muted-foreground line-clamp-2">{notif.description}</p>
                                                <p className="text-[8px] text-primary/60 pt-1">{safeFormatFirebaseTimestamp(notif.createdAt)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            )}

            {isAdmin && ( activeTab === 'review' && (
                <TabsContent value="review" className="m-0 space-y-6">
                    <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">طلبات المراجعة ({reviewItems.length})</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoadingReview ? <Loader2 className="animate-spin mx-auto mt-10" /> : reviewItems.map(item => (
                            <Card key={item.id} className="overflow-hidden">
                                <div className="aspect-video relative bg-muted">
                                    {item.imageUrl && <img src={item.imageUrl} className="object-cover w-full h-full" />}
                                </div>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                    <CardDescription>النمط: {item.displayStyle} | القسم: {categories?.find(c => c.id === item.categoryId)?.name}</CardDescription>
                                </CardHeader>
                                <CardFooter className="p-4 border-t gap-2">
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateDocumentNonBlocking(doc(firestore!, 'categories', item.categoryId, 'items', item.id), { status: 'approved' })}><CheckCircle className="ml-2 h-4 w-4" /> قبول</Button>
                                    <Button variant="destructive" onClick={() => confirm("رفض وحذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', item.categoryId, 'items', item.id))}>حذف</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            ))}

            {isAdmin && (
                <TabsContent value="settings" className="space-y-6 m-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Theme Settings */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> مظهر المنصة</CardTitle><CardDescription>تحكم في الألوان الأساسية للموقع</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><label className="text-xs font-bold">اللون الأساسي (فاتح):</label><div className="flex gap-2"><Input value={themeConfig?.primaryColor || ''} onChange={(e) => updateConfig('theme', { primaryColor: e.target.value })} placeholder="350 72% 51%" /><div className="w-10 h-10 rounded border" style={{ backgroundColor: `hsl(${themeConfig?.primaryColor})` }} /></div></div>
                                <div className="space-y-2"><label className="text-xs font-bold">اللون الأساسي (ليلي):</label><div className="flex gap-2"><Input value={themeConfig?.primaryColorDark || ''} onChange={(e) => updateConfig('theme', { primaryColorDark: e.target.value })} placeholder="350 72% 51%" /><div className="w-10 h-10 rounded border" style={{ backgroundColor: `hsl(${themeConfig?.primaryColorDark})` }} /></div></div>
                            </CardContent>
                        </Card>

                        {/* Subscription Popup Settings */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> نافذة الاشتراك</CardTitle><CardDescription>النافذة المنبثقة التي تظهر للزوار</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted rounded-xl"><span>تفعيل النافذة</span><Switch checked={subDialogConfig?.enabled || false} onCheckedChange={(val) => updateConfig('subscriptionDialog', { enabled: val })} /></div>
                                <div className="space-y-2"><label className="text-xs font-bold">العنوان:</label><Input value={subDialogConfig?.title || ''} onChange={(e) => updateConfig('subscriptionDialog', { title: e.target.value })} /></div>
                                <div className="space-y-2"><label className="text-xs font-bold">النص الوصفي:</label><Textarea value={subDialogConfig?.description || ''} onChange={(e) => updateConfig('subscriptionDialog', { description: e.target.value })} /></div>
                                <div className="space-y-2"><label className="text-xs font-bold">رابط الاشتراك:</label><Input value={subDialogConfig?.link || ''} onChange={(e) => updateConfig('subscriptionDialog', { link: e.target.value })} /></div>
                            </CardContent>
                        </Card>

                        {/* Request Design Settings */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><MousePointer2 className="h-5 w-5 text-primary" /> اطلب تصميمك</CardTitle><CardDescription>إعدادات زر طلب التصميم في المنيو</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted rounded-xl"><span>تفعيل الزر</span><Switch checked={reqDesignConfig?.enabled || false} onCheckedChange={(val) => updateConfig('requestDesign', { enabled: val })} /></div>
                                <div className="space-y-2"><label className="text-xs font-bold">رابط الطلب (واتساب/فورم):</label><Input value={reqDesignConfig?.url || ''} onChange={(e) => updateConfig('requestDesign', { url: e.target.value })} /></div>
                            </CardContent>

                        {/* Referral System Settings */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> نظام الإحالة</CardTitle><CardDescription>قواعد النقاط والترقيات التلقائية</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><label className="text-xs font-bold">هدف الترقية (إحالات):</label><Input type="number" value={refConfig?.requiredReferrals || 5} onChange={(e) => updateConfig('referral', { requiredReferrals: parseInt(e.target.value) })} /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold">نقاط كل إحالة:</label><Input type="number" value={refConfig?.pointsPerReferral || 10} onChange={(e) => updateConfig('referral', { pointsPerReferral: parseInt(e.target.value) })} /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold">تكلفة فتح ملف (نقطة):</label><Input type="number" value={refConfig?.pointsPerUnlock || 5} onChange={(e) => updateConfig('referral', { pointsPerUnlock: parseInt(e.target.value) })} /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold">فاصل المكافآت:</label><Input type="number" value={refConfig?.rewardInterval || 5} onChange={(e) => updateConfig('referral', { rewardInterval: parseInt(e.target.value) })} /></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            )}

            {isAdmin && (
                <TabsContent value="users" className="space-y-6 m-0">
                    <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">المستخدمين المعتمدين</h2><Button onClick={() => setIsAddUserOpen(true)}><UserPlus className="ml-2 h-4 w-4" /> إضافة يدوية</Button></div>
                    <Card className="overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead className="text-right">البريد الإلكتروني</TableHead><TableHead className="text-right">الصلاحية</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">كود التفعيل</TableHead><TableHead className="text-left">إجراء</TableHead></TableRow></TableHeader>
                            <TableBody>{whitelist?.map(entry => (<TableRow key={entry.email}><TableCell className="text-right font-medium">{entry.email}</TableCell><TableCell className="text-right"><Badge variant="secondary">{entry.role}</Badge></TableCell><TableCell className="text-right">{entry.isActivated ? <Badge className="bg-green-500">نشط</Badge> : <Badge variant="outline">في الانتظار</Badge>}</TableCell><TableCell className="text-right font-mono text-xs">{entry.activationCode || '---'}</TableCell><TableCell className="text-left">{entry.activatedByUid && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteUserAccount(entry.activatedByUid!).then(() => toast({title:"تم الحذف"}))}><UserMinus className="h-4 w-4" /></Button>}</TableCell></TableRow>))}</TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            )}
        </Tabs>
      </main>

      {/* Dialogs */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>{editingCategory?.id ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
                <DialogDescription>أدخل بيانات القسم لإدارته في الموقع الرئيسي.</DialogDescription>
              </DialogHeader>
              <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-4">
                      <FormField control={catForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>اسم القسم</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                      <FormField control={catForm.control} name="displayStyle" render={({ field }) => (<FormItem><FormLabel>نمط العرض</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="style1">تحميل (أفقي)</SelectItem><SelectItem value="style3">برومبت (بطاقات)</SelectItem><SelectItem value="style4">فيديو (عرض فيديو)</SelectItem><SelectItem value="style5">معرض (Style 5)</SelectItem></SelectContent></Select></FormItem>)} />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={catForm.control} name="visibility" render={({ field }) => (<FormItem><FormLabel>الظهور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="public">عام</SelectItem><SelectItem value="pro">برو</SelectItem></SelectContent></Select></FormItem>)} />
                          <FormField control={catForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>الترتيب</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} />
                      </div>
                      <FormField control={catForm.control} name="isUnderMaintenance" render={({ field }) => (<FormItem className="flex items-center justify-between rounded-xl border p-4 bg-muted/20"><div className="space-y-0.5"><FormLabel>وضع الصيانة</FormLabel><FormDescription className="text-[10px]">تفعيل صفحة الصيانة لهذا القسم</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <DialogFooter><Button type="submit" className="w-full h-12 text-lg">حفظ كافة التغييرات</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>إضافة مستخدم يدوياً</DialogTitle>
                <DialogDescription>امنح صلاحيات الوصول والاشتراك للمستخدمين عبر بريدهم.</DialogDescription>
              </DialogHeader>
              <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onAddUser)} className="space-y-4">
                      <FormField control={userForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input {...field} placeholder="example@mail.com" /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={userForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>الدور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pro">عضو برو (Pro)</SelectItem><SelectItem value="editor">محرر (Editor)</SelectItem><SelectItem value="admin">مدير (Admin)</SelectItem></SelectContent></Select></FormItem>)} />
                      {userForm.watch('role') === 'pro' && <FormField control={userForm.control} name="activationCode" render={({ field }) => (<FormItem><FormLabel>كود تفعيل (اختياري)</FormLabel><FormControl><Input {...field} placeholder="اتركه فارغاً للتوليد التلقائي" /></FormControl></FormItem>)} />}
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-12" disabled={userForm.formState.isSubmitting}>{userForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "إضافة المستخدم الآن"}</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
