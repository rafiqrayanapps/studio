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
    XCircle,
    Loader2,
    LayoutDashboard,
    ArrowLeft,
    ShieldCheck,
    Gift,
    Layers,
    UserMinus,
    Menu,
    X,
    UserPlus,
    Save
} from 'lucide-react';

import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

import type { Category, ContentItem, WhitelistEntry, ReferralConfig } from '@/lib/definitions';
import { deleteUserAccount } from '@/lib/user-actions';

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

const referralConfigSchema = z.object({
    requiredReferrals: z.number().min(1),
    pointsPerReferral: z.number().min(1),
    pointsPerUnlock: z.number().min(1),
    rewardInterval: z.number().min(1),
});

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('items');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Queries
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: whitelist } = useCollection<WhitelistEntry>(whitelistQuery);

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: referralConfig } = useDoc<ReferralConfig>(referralConfigRef);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !selectedCategoryId) return null;
      return query(collection(firestore, 'categories', selectedCategoryId, 'items'), orderBy('order', 'asc'));
  }, [firestore, selectedCategoryId]);
  const { data: currentItems, isLoading: isLoadingItems } = useCollection<ContentItem>(itemsQuery);

  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

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

  const configForm = useForm<z.infer<typeof referralConfigSchema>>({
      resolver: zodResolver(referralConfigSchema),
      values: referralConfig ? {
          requiredReferrals: referralConfig.requiredReferrals || 5,
          pointsPerReferral: referralConfig.pointsPerReferral || 10,
          pointsPerUnlock: referralConfig.pointsPerUnlock || 5,
          rewardInterval: referralConfig.rewardInterval || 5,
      } : undefined
  });

  // Effects
  useEffect(() => {
      if (!isUserLoading && isAdmin) {
          setActiveTab('categories');
      }
  }, [isAdmin, isUserLoading]);

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
      if (!firestore || !editingCategory) return;
      try {
          const catRef = doc(firestore, 'categories', editingCategory.id);
          await setDoc(catRef, values, { merge: true });
          toast({ title: "تم تحديث القسم بنجاح" });
          setEditingCategory(null);
      } catch (e) {
          toast({ title: "فشل تحديث القسم", variant: "destructive" });
      }
  };

  const onAddUser = async (values: z.infer<typeof userWhitelistSchema>) => {
      if (!firestore) return;
      try {
          const email = values.email.toLowerCase().trim();
          const userRef = doc(firestore, 'whitelist', email);
          
          const activationCode = values.role === 'pro' 
            ? (values.activationCode || `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)
            : '';

          await setDoc(userRef, {
              email,
              role: values.role,
              activationCode,
              isActivated: false,
              createdAt: serverTimestamp(),
          });

          toast({ title: "تمت إضافة المستخدم للقائمة بنجاح" });
          userForm.reset();
          setIsAddUserOpen(false);
      } catch (e) {
          toast({ title: "فشل إضافة المستخدم", variant: "destructive" });
      }
  };

  const onUpdateConfig = async (values: z.infer<typeof referralConfigSchema>) => {
      if (!firestore) return;
      try {
          await setDoc(doc(firestore, 'appConfig', 'referral'), values, { merge: true });
          toast({ title: "تم حفظ الإعدادات بنجاح" });
      } catch (e) {
          toast({ title: "فشل حفظ الإعدادات", variant: "destructive" });
      }
  };

  const handleApproveItem = async (item: any) => {
    if (!firestore || !isAdmin) return;
    try {
      await updateDocumentNonBlocking(doc(firestore, 'categories', item.categoryId, 'items', item.id), { status: 'approved' });
      setReviewItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "تم قبول المحتوى بنجاح" });
    } catch (e) {
      toast({ title: "فشل في قبول المحتوى", variant: "destructive" });
    }
  };

  const handleRejectItem = async (item: any) => {
    if (!firestore || !isAdmin) return;
    try {
      await deleteDocumentNonBlocking(doc(firestore, 'categories', item.categoryId, 'items', item.id));
      setReviewItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "تم حذف المحتوى المرفوض" });
    } catch (e) {
      toast({ title: "فشل في حذف المحتوى", variant: "destructive" });
    }
  };

  const menuItems = [
    ...(isAdmin ? [{ id: 'categories', label: 'الأقسام', icon: Layers }] : []),
    { id: 'items', label: 'إضافة محتوى', icon: Plus },
    ...(isAdmin ? [
        { id: 'review', label: 'المراجعة', icon: ShieldCheck, badge: reviewItems.length },
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
            <h1 className="font-bold text-xl mt-2 text-center">لوحة التحكم</h1>
            <Badge variant="secondary" className="px-3">{isAdmin ? "مدير النظام" : "محرر محتوى"}</Badge>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'}`}>
                    <item.icon className="h-5 w-5" />
                    <span className="font-bold">{item.label}</span>
                    {item.badge ? <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span> : null}
                </button>
            ))}
        </nav>
        <div className="p-4 border-t">
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => router.push('/home')}><ArrowLeft className="ml-2 h-4 w-4" /> العودة للتطبيق</Button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-card border-b z-40 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="bg-primary text-primary-foreground p-1.5 rounded-lg"><LayoutDashboard className="h-5 w-5" /></div><span className="font-bold text-sm">لوحة التحكم</span></div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                  <SheetHeader className="sr-only"><SheetTitle>القائمة</SheetTitle><SheetDescription>إدارة الموقع</SheetDescription></SheetHeader>
                  <div className="flex flex-col h-full bg-card">
                      <div className="p-6 border-b flex flex-col items-center gap-2"><h1 className="font-bold text-lg">قائمة التحكم</h1><Badge variant="secondary">{isAdmin ? "مدير" : "محرر"}</Badge></div>
                      <nav className="flex-1 p-4 space-y-2">
                          {menuItems.map(item => (
                              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                                  <item.icon className="h-5 w-5" /><span className="font-bold">{item.label}</span>
                              </button>
                          ))}
                      </nav>
                      <div className="p-4 border-t"><Button variant="outline" className="w-full rounded-xl" onClick={() => router.push('/home')}>العودة للتطبيق</Button></div>
                  </div>
              </SheetContent>
          </Sheet>
      </div>

      <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            
            <TabsContent value="categories" className="m-0 space-y-6">
                <div className="flex justify-between items-center"><h2 className="text-xl lg:text-2xl font-bold">إدارة الأقسام</h2>{isAdmin && <Button size="sm" onClick={() => setEditingCategory({ id: '', name: '', displayStyle: 'style1', visibility: 'public', parentId: null } as any)}><Plus className="ml-1 h-4 w-4" /> جديد</Button>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories?.map(cat => (
                        <Card key={cat.id} className="group overflow-hidden">
                            <CardHeader className="p-4 bg-muted/30"><div className="flex justify-between items-start"><CardTitle className="text-lg">{cat.name}</CardTitle><Badge variant={cat.visibility === 'pro' ? 'default' : 'outline'}>{cat.visibility === 'pro' ? 'برو' : 'عام'}</Badge></div><CardDescription className="text-xs">النمط: {cat.displayStyle}</CardDescription></CardHeader>
                            <CardFooter className="p-2 border-t flex justify-between gap-2">
                                <Button variant="ghost" className="text-xs flex-1" onClick={() => { setSelectedCategoryId(cat.id); setActiveTab('items'); }}><FileText className="ml-1 h-3 w-3" /> المحتوى</Button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                    {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف القسم؟") && deleteDocumentNonBlocking(doc(firestore, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>}
                                </div>
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
                                <div className="space-y-2"><label className="text-xs font-bold">القسم:</label><Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر القسم..." /></SelectTrigger><SelectContent>{categories?.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select></div>
                                <div className="space-y-2"><label className="text-xs font-bold">النمط:</label><Select value={itemForm.watch('displayStyle')} onValueChange={(val: any) => itemForm.setValue('displayStyle', val)}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="style1">تحميل (Style 1)</SelectItem><SelectItem value="style3">برومبت (Style 3)</SelectItem><SelectItem value="style4">فيديو (Style 4)</SelectItem><SelectItem value="style5">معرض (Style 5)</SelectItem></SelectContent></Select></div>
                            </div>
                            {selectedCategoryId && (
                                <Form {...itemForm}>
                                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-5 pt-4 border-t">
                                        <FormField control={itemForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>العنوان</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>رابط الصورة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        {(itemForm.watch('displayStyle') === 'style1') && <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (<FormItem><FormLabel>رابط التحميل</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />}
                                        {itemForm.watch('displayStyle') === 'style3' && (
                                            <div className="space-y-4">
                                                <FormField control={itemForm.control} name="prompt" render={({ field }) => (<FormItem><FormLabel>البرومبت</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                                                <FormField control={itemForm.control} name="instructions" render={({ field }) => (<FormItem><FormLabel>التعليمات</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                            </div>
                                        )}
                                        {itemForm.watch('displayStyle') === 'style4' && <FormField control={itemForm.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel>رابط الفيديو</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />}
                                        <div className="flex gap-4"><FormField control={itemForm.control} name="visibility" render={({ field }) => (<FormItem className="flex-1"><FormLabel>الظهور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="public">عام</SelectItem><SelectItem value="pro">برو</SelectItem></SelectContent></Select></FormItem>)} /><FormField control={itemForm.control} name="order" render={({ field }) => (<FormItem className="w-24"><FormLabel>الترتيب</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} /></div>
                                        <Button type="submit" className="w-full h-14" disabled={itemForm.formState.isSubmitting}>{itemForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="ml-2 h-5 w-5" />}{isAdmin ? "نشر فوراً" : "إرسال للمراجعة"}</Button>
                                    </form>
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> المحتوى الحالي</CardTitle></CardHeader><CardContent><ScrollArea className="h-[500px]"><div className="space-y-3">{isLoadingItems ? <Loader2 className="animate-spin mx-auto" /> : currentItems?.map(item => (<div key={item.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-xl group"><div className="h-10 w-10 rounded bg-muted overflow-hidden">{item.imageUrl && <img src={item.imageUrl} className="object-cover h-full w-full" />}</div><div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{item.title}</p><Badge variant={item.status === 'pending' ? 'outline' : 'secondary'} className="text-[8px] h-4">{item.status === 'pending' ? 'مراجعة' : 'منشور'}</Badge></div>{isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore, 'categories', selectedCategoryId, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button>}</div>))}</div></ScrollArea></CardContent></Card>
                </div>
            </TabsContent>

            {isAdmin && (
                <TabsContent value="review" className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary" /> مراجعة الطلبات</h2>
                    {isLoadingReview ? <Loader2 className="animate-spin mx-auto" /> : reviewItems.length > 0 ? (
                        <div className="grid gap-4">
                            {reviewItems.map(item => (
                                <Card key={item.id} className="overflow-hidden border-2 border-primary/10">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="w-full md:w-48 aspect-video md:aspect-square bg-muted">{item.imageUrl && <img src={item.imageUrl} className="object-cover h-full w-full" />}</div>
                                        <div className="flex-1 p-6 space-y-4">
                                            <div className="flex justify-between items-start"><div><h3 className="font-bold text-xl">{item.title}</h3><Badge variant="secondary">قسم: {categories?.find(c => c.id === item.categoryId)?.name}</Badge></div><Badge>{item.visibility}</Badge></div>
                                            <div className="flex gap-2"><Button className="bg-green-600 flex-1" onClick={() => handleApproveItem(item)}>قبول</Button><Button variant="destructive" className="flex-1" onClick={() => handleRejectItem(item)}>رفض</Button></div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : <Card className="p-20 text-center text-muted-foreground"><CheckCircle className="mx-auto h-12 w-12 opacity-20 mb-2" /><p>لا توجد طلبات معلقة</p></Card>}
                </TabsContent>
            )}

            {isAdmin && (
                <TabsContent value="users" className="space-y-6">
                    <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">إدارة القائمة البيضاء</h2><Button onClick={() => setIsAddUserOpen(true)}><UserPlus className="ml-2 h-4 w-4" /> إضافة مستخدم</Button></div>
                    <Card className="overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead className="text-right">البريد</TableHead><TableHead className="text-right">الدور</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">كود التفعيل</TableHead><TableHead className="text-left">إجراء</TableHead></TableRow></TableHeader>
                            <TableBody>{whitelist?.map(entry => (<TableRow key={entry.email}><TableCell className="text-right font-medium">{entry.email}</TableCell><TableCell className="text-right"><Badge variant="secondary">{entry.role}</Badge></TableCell><TableCell className="text-right">{entry.isActivated ? <Badge className="bg-green-500">نشط</Badge> : <Badge variant="outline">انتظار</Badge>}</TableCell><TableCell className="text-right font-mono text-xs">{entry.activationCode || '---'}</TableCell><TableCell className="text-left">{entry.activatedByUid && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteUserAccount(entry.activatedByUid!).then(() => toast({title:"تم الحذف"}))}><UserMinus className="h-4 w-4" /></Button>}</TableCell></TableRow>))}</TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            )}

            {isAdmin && (
                <TabsContent value="settings" className="space-y-6">
                    <h2 className="text-2xl font-bold">إعدادات المنصة</h2>
                    <Form {...configForm}>
                        <form onSubmit={configForm.handleSubmit(onUpdateConfig)} className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>نظام الإحالة والمكافآت</CardTitle><CardDescription>تحكم في كيفية عمل النقاط وترقيات برو التلقائية</CardDescription></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={configForm.control} name="requiredReferrals" render={({ field }) => (<FormItem><FormLabel>هدف الإحالات للترقية (برو)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} />
                                    <FormField control={configForm.control} name="pointsPerReferral" render={({ field }) => (<FormItem><FormLabel>النقاط الممنوحة عن كل إحالة</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} />
                                    <FormField control={configForm.control} name="pointsPerUnlock" render={({ field }) => (<FormItem><FormLabel>تكلفة فتح ملف برو (بالنقاط)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} />
                                    <FormField control={configForm.control} name="rewardInterval" render={({ field }) => (<FormItem><FormLabel>فاصل أكواد المكافآت (مثلاً كل 5 إحالات)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} />
                                </CardContent>
                                <CardFooter className="border-t pt-6"><Button type="submit" className="w-full" disabled={configForm.formState.isSubmitting}><Save className="ml-2 h-4 w-4" /> حفظ كافة الإعدادات</Button></CardFooter>
                            </Card>
                        </form>
                    </Form>
                </TabsContent>
            )}
        </Tabs>
      </main>

      {/* Dialogs */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2rem]">
              <DialogHeader><DialogTitle>{editingCategory?.id ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle></DialogHeader>
              <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-4">
                      <FormField control={catForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>اسم القسم</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                      <FormField control={catForm.control} name="displayStyle" render={({ field }) => (<FormItem><FormLabel>نمط العرض</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="style1">تحميل</SelectItem><SelectItem value="style3">برومبت</SelectItem><SelectItem value="style4">فيديو</SelectItem><SelectItem value="style5">معرض</SelectItem></SelectContent></Select></FormItem>)} />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={catForm.control} name="visibility" render={({ field }) => (<FormItem><FormLabel>الظهور</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="public">عام</SelectItem><SelectItem value="pro">برو</SelectItem></SelectContent></Select></FormItem>)} />
                          <FormField control={catForm.control} name="order" render={({ field }) => (<FormItem><FormLabel>الترتيب</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>)} />
                      </div>
                      <FormField control={catForm.control} name="isUnderMaintenance" render={({ field }) => (<FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>وضع الصيانة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-12">حفظ التغييرات</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2rem]">
              <DialogHeader><DialogTitle>إضافة مستخدم للقائمة البيضاء</DialogTitle><DialogDescription>امنح صلاحيات الوصول والاشتراك يدوياً</DialogDescription></DialogHeader>
              <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onAddUser)} className="space-y-4">
                      <FormField control={userForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input {...field} placeholder="example@mail.com" /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={userForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>الدور الصلاحي</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pro">عضو برو (Pro)</SelectItem><SelectItem value="editor">محرر محتوى (Editor)</SelectItem><SelectItem value="admin">مدير نظام (Admin)</SelectItem></SelectContent></Select></FormItem>)} />
                      {userForm.watch('role') === 'pro' && <FormField control={userForm.control} name="activationCode" render={({ field }) => (<FormItem><FormLabel>كود تفعيل مخصص (اختياري)</FormLabel><FormControl><Input {...field} placeholder="اتركه فارغاً لتوليد كود تلقائي" /></FormControl></FormItem>)} />}
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-12" disabled={userForm.formState.isSubmitting}>{userForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "إضافة المستخدم"}</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}