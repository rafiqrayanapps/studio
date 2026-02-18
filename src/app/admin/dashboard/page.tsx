'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Search, 
    Settings, 
    Bell, 
    Package, 
    Users, 
    FileText, 
    CheckCircle, 
    XCircle,
    Loader2,
    Save,
    LayoutDashboard,
    ArrowLeft,
    Eye,
    Palette,
    Share2,
    Megaphone,
    UserMinus,
    ShieldCheck,
    Gift,
    ExternalLink,
    Brush,
    Layers
} from 'lucide-react';

import { useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Category, ContentItem, PricingPlan, Notification, ThemeConfig, SubscriptionDialogConfig, ShareLinkConfig, RequestDesignConfig, WhitelistEntry, ReferralConfig, UserProfile } from '@/lib/definitions';
import { deleteUserAccount } from '@/lib/user-actions';
import DynamicIcon from '@/components/ui/dynamic-icon';

export default function AdminDashboard() {
  const { isAdmin, isEditor, user } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('categories');

  // --- Data Fetching ---
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: categories, isLoading: isLoadingCats } = useCollection<Category>(categoriesQuery);

  const whitelistQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: whitelist, isLoading: isLoadingWhitelist } = useCollection<WhitelistEntry>(whitelistQuery);

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: referralConfig } = useDoc<ReferralConfig>(referralConfigRef);

  // --- Content Review Logic (Admin Only) ---
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

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
    fetchPendingItems();
  }, [firestore, isAdmin, categories, activeTab]);

  const handleApproveItem = async (item: any) => {
    if (!firestore || !isAdmin) return;
    try {
      const itemRef = doc(firestore, 'categories', item.categoryId, 'items', item.id);
      await setDoc(itemRef, { status: 'approved' }, { merge: true });
      setReviewItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "تم قبول المحتوى بنجاح" });
    } catch (e) {
      toast({ title: "فشل في قبول المحتوى", variant: "destructive" });
    }
  };

  const handleRejectItem = async (item: any) => {
    if (!firestore || !isAdmin) return;
    try {
      const itemRef = doc(firestore, 'categories', item.categoryId, 'items', item.id);
      await deleteDocumentNonBlocking(itemRef);
      setReviewItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "تم حذف المحتوى المرفوض" });
    } catch (e) {
      toast({ title: "فشل في حذف المحتوى", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (entry: WhitelistEntry) => {
    if (!firestore || !isAdmin) return;
    if (!confirm(`هل أنت متأكد من حذف ${entry.email}؟ سيتم حذفه من القائمة البيضاء والمصادقة.`)) return;

    try {
        if (entry.activatedByUid) {
            const result = await deleteUserAccount(entry.activatedByUid);
            if (!result.success) {
                toast({ title: result.error || "فشل حذف حساب المستخدم", variant: "destructive" });
                return;
            }
        }

        const whitelistRef = doc(firestore, 'whitelist', entry.email.toLowerCase());
        await deleteDocumentNonBlocking(whitelistRef);
        
        toast({ title: "تم حذف المستخدم بالكامل من النظام" });
    } catch (e) {
        toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" });
    }
  };

  const referralForm = useForm<ReferralConfig>({
      defaultValues: { requiredReferrals: 5, rewardInterval: 5 }
  });

  useEffect(() => {
      if (referralConfig) referralForm.reset(referralConfig);
  }, [referralConfig, referralForm]);

  const onReferralSubmit = async (values: ReferralConfig) => {
      if (!firestore || !isAdmin) return;
      await setDoc(doc(firestore, 'appConfig', 'referral'), values, { merge: true });
      toast({ title: "تم حفظ إعدادات الإحالة" });
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden md:flex w-64 flex-col bg-card border-l sticky top-0 h-screen">
        <div className="p-6 border-b flex flex-col items-center gap-2">
            <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg">
                <LayoutDashboard className="h-8 w-8" />
            </div>
            <h1 className="font-bold text-xl mt-2">لوحة التحكم</h1>
            <Badge variant="secondary" className="px-3">{isAdmin ? "مدير النظام" : "محرر محتوى"}</Badge>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            {[
                { id: 'categories', label: 'الأقسام', icon: Layers },
                { id: 'items', label: 'إضافة محتوى', icon: FileText },
                ...(isAdmin ? [
                    { id: 'review', label: 'مراجعة المحتوى', icon: ShieldCheck, badge: reviewItems.length },
                    { id: 'users', label: 'المستخدمين', icon: Users },
                    { id: 'settings', label: 'الإعدادات', icon: Settings }
                ] : [])
            ].map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'
                    }`}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="font-bold">{item.label}</span>
                    {item.badge ? (
                        <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span>
                    ) : null}
                </button>
            ))}
        </nav>
        <div className="p-4 border-t">
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => router.push('/home')}>
                <ArrowLeft className="ml-2 h-4 w-4" />
                العودة للتطبيق
            </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            
            <TabsContent value="categories" className="m-0 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">إدارة الأقسام</h2>
                    {isAdmin && (
                         <Button onClick={() => {}} className="rounded-xl">
                            <Plus className="ml-2 h-4 w-4" /> إضافة قسم
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories?.map(cat => (
                        <Card key={cat.id} className="group overflow-hidden">
                            <CardHeader className="p-4 bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{cat.name}</CardTitle>
                                    <Badge variant={cat.visibility === 'pro' ? 'default' : 'outline'}>{cat.visibility}</Badge>
                                </div>
                                <CardDescription className="text-xs">النمط: {cat.displayStyle}</CardDescription>
                            </CardHeader>
                            <CardFooter className="p-2 border-t flex justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><Edit2 className="h-4 w-4" /></Button>
                                {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            {isAdmin && (
                <TabsContent value="review" className="m-0 space-y-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <h2 className="text-2xl font-bold">مراجعة المحتوى الجديد</h2>
                    </div>
                    {isLoadingReview ? (
                        <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    ) : reviewItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {reviewItems.map(item => (
                                <Card key={item.id} className="overflow-hidden border-2 border-primary/20">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="w-full md:w-64 aspect-video relative bg-muted">
                                            {item.imageUrl && <img src={item.imageUrl} className="object-cover w-full h-full" alt={item.title} />}
                                        </div>
                                        <CardContent className="flex-1 p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-bold">{item.title}</h3>
                                                <Badge variant="secondary">قسم: {categories?.find(c => c.id === item.categoryId)?.name}</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                {item.prompt && (
                                                    <div className="space-y-1">
                                                        <span className="font-bold text-muted-foreground">البرومبت:</span>
                                                        <p className="p-2 bg-muted rounded font-mono text-xs">{item.prompt}</p>
                                                    </div>
                                                )}
                                                {item.videoUrl && (
                                                    <div className="space-y-1">
                                                        <span className="font-bold text-muted-foreground">رابط الفيديو:</span>
                                                        <a href={item.videoUrl} target="_blank" className="text-primary underline flex items-center gap-1">المشاهدة <ExternalLink className="h-3 w-3" /></a>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-3 pt-4 border-t">
                                                <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => handleApproveItem(item)}>
                                                    <CheckCircle className="ml-2 h-4 w-4" /> قبول ونشر
                                                </Button>
                                                <Button variant="destructive" className="flex-1" onClick={() => handleRejectItem(item)}>
                                                    <XCircle className="ml-2 h-4 w-4" /> رفض وحذف
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-20 text-center text-muted-foreground">
                            <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p className="text-xl">لا توجد طلبات مراجعة حالياً.</p>
                        </Card>
                    )}
                </TabsContent>
            )}

            {isAdmin && (
                <TabsContent value="users" className="m-0 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">إدارة المستخدمين والصلاحيات</h2>
                        <Button className="rounded-xl">إضافة مستخدم جديد</Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>البريد الإلكتروني</TableHead>
                                    <TableHead>الدور</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>الأجهزة</TableHead>
                                    <TableHead className="text-left">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {whitelist?.map(entry => (
                                    <TableRow key={entry.email}>
                                        <TableCell className="font-medium">{entry.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={entry.role === 'admin' ? 'destructive' : entry.role === 'editor' ? 'default' : 'secondary'}>
                                                {entry.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {entry.isActivated ? <Badge className="bg-green-500">نشط</Badge> : <Badge variant="outline">غير مفعل</Badge>}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {entry.deviceFingerprints?.length || 0} جهاز
                                        </TableCell>
                                        <TableCell className="text-left">
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(entry)}>
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            )}

            {isAdmin && (
                <TabsContent value="settings" className="m-0 space-y-6">
                    <h2 className="text-2xl font-bold">إعدادات النظام العامة</h2>
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        
                        <AccordionItem value="referral" className="border-none">
                            <Card>
                                <AccordionTrigger className="p-6 font-bold text-lg hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Gift className="h-6 w-6 text-primary" />
                                        إعدادات نظام الإحالة والمكافآت
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 border-t pt-6">
                                    <Form {...referralForm}>
                                        <form onSubmit={referralForm.handleSubmit(onReferralSubmit)} className="space-y-6 max-w-lg">
                                            <FormField control={referralForm.control} name="requiredReferrals" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>عدد الإحالات المطلوب لفتح "برو"</FormLabel>
                                                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                                    <FormDescription>عدد المستخدمين الجدد الذين يجب أن يسجلوا بكود المستخدم ليصبح "برو" تلقائياً.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={referralForm.control} name="rewardInterval" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>معدل تراكم الأكواد الإضافية</FormLabel>
                                                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                                    <FormDescription>بعد تفعيل البرو، سيحصل المستخدم على كود جديد لكل X إحالات إضافية.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" className="w-full h-12 rounded-xl">حفظ إعدادات الإحالة</Button>
                                        </form>
                                    </Form>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>

                        <AccordionItem value="design-request" className="border-none">
                            <Card>
                                <AccordionTrigger className="p-6 font-bold text-lg hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Brush className="h-6 w-6 text-primary" />
                                        إدارة رابط "اطلب تصميمك"
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 border-t pt-6">
                                    <p className="text-sm text-muted-foreground mb-4">تحكم في ظهور رابط طلب التصميم في القائمة الجانبية ورابط التواصل المخصص له.</p>
                                    <Button variant="outline">تعديل الإعدادات</Button>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>
            )}

        </Tabs>
      </main>
    </div>
  );
}
