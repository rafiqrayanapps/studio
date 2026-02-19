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
    ChevronDown,
    Globe,
    Image as ImageIcon,
    PlayCircle,
    SquareArrowOutUpRight
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
  displayStyle: z.string().default('style1'),
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

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('categories');
  
  // Selection Logic for Items
  const [selectedMainId, setSelectedMainId] = useState<string>('');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  
  const allCategories = useMemo(() => {
      if (!rawCategories) return [];
      return [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawCategories]);

  const mainCategories = useMemo(() => allCategories.filter(c => !c.parentId), [allCategories]);
  const subCategories = useMemo(() => {
      if (!selectedMainId) return [];
      return allCategories.filter(c => c.parentId === selectedMainId);
  }, [allCategories, selectedMainId]);

  const effectiveCategoryId = selectedSubId || selectedMainId;
  const targetCategory = useMemo(() => allCategories.find(c => c.id === effectiveCategoryId), [allCategories, effectiveCategoryId]);

  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !effectiveCategoryId) return null;
      return query(collection(firestore, 'categories', effectiveCategoryId, 'items'));
  }, [firestore, effectiveCategoryId]);
  const { data: rawItems } = useCollection<ContentItem>(itemsQuery);
  
  const currentItems = useMemo(() => {
      if (!rawItems) return [];
      return [...rawItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawItems]);

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { 
        title: '', 
        imageUrl: '', 
        displayStyle: 'style1', 
        downloadUrl: '', 
        prompt: '', 
        instructions: '', 
        videoUrl: '', 
        visibility: 'public', 
        isNew: false 
    }
  });

  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { 
          name: '', 
          displayStyle: 'style1', 
          visibility: 'public', 
          isUnderMaintenance: false, 
          fileTypes: '',
          parentId: null
      }
  });

  // Update item style when category changes
  useEffect(() => {
      if (targetCategory) {
          itemForm.setValue('displayStyle', targetCategory.displayStyle);
      }
  }, [targetCategory, itemForm]);

  const onAddItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !effectiveCategoryId) return;
    try {
      const nextOrder = currentItems.length;
      const itemData = { 
          ...values, 
          order: nextOrder, 
          createdAt: serverTimestamp(), 
          status: isAdmin ? 'approved' : 'pending' 
      };
      await addDocumentNonBlocking(collection(firestore, 'categories', effectiveCategoryId, 'items'), itemData);
      toast({ title: isAdmin ? "تم النشر بنجاح" : "بانتظار المراجعة" });
      itemForm.reset({
          ...itemForm.getValues(),
          title: '',
          imageUrl: '',
          downloadUrl: '',
          prompt: '',
          videoUrl: ''
      });
    } catch (e) {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
    }
  };

  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingCategory?.id || editingCategory.id === '';
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          await setDoc(doc(firestore, 'categories', catId), {
              ...values,
              order: isNew ? mainCategories.length : (editingCategory!.order ?? 0),
              createdAt: isNew ? serverTimestamp() : editingCategory!.createdAt
          }, { merge: true });
          toast({ title: "تم الحفظ بنجاح" });
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

  if (isUserLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="flex min-h-screen bg-secondary/30" dir="rtl">
      {/* Sidebar */}
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
                    { id: 'categories', label: 'الأقسام الرئيسية', icon: Layers },
                    { id: 'items', label: 'إدارة المحتوى', icon: Plus },
                    { id: 'users', label: 'المستخدمين', icon: Users, adminOnly: true },
                    { id: 'settings', label: 'إعدادات النظام', icon: Settings, adminOnly: true }
                ].filter(item => !item.adminOnly || isAdmin).map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-primary/5'}`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </ScrollArea>
        <div className="p-6 border-t">
            <Button variant="outline" className="w-full rounded-2xl font-bold" onClick={() => router.push('/home')}>العودة للتطبيق</Button>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
        <Tabs value={activeTab} className="space-y-8">
            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-black text-foreground">إدارة الأقسام</h2>
                    <Button 
                        size="lg" 
                        className="rounded-2xl font-black shadow-xl shadow-primary/20" 
                        onClick={() => { catForm.reset(); setEditingCategory({ id: '' } as any); }}
                    >
                        <Plus className="ml-2 h-5 w-5" /> إضافة قسم جديد
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allCategories.map((cat, idx) => (
                        <Card key={cat.id} className="overflow-hidden border-2 border-primary/5 hover:border-primary/20 transition-all shadow-sm group">
                            <CardHeader className="p-6 bg-muted/20 flex-row justify-between items-start space-y-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-xl font-black">{cat.name}</CardTitle>
                                        {cat.parentId && <Badge variant="outline" className="text-[10px]">فرعي</Badge>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge variant="secondary" className="text-[10px] font-bold">النمط: {cat.displayStyle}</Badge>
                                        {cat.fileTypes && <Badge className="bg-primary/10 text-primary text-[10px] border-none font-bold uppercase">{cat.fileTypes}</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 bg-background/50 p-1 rounded-xl border">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" disabled={idx === 0} onClick={() => moveItem(allCategories, idx, 'up', ['categories'])}><ChevronUp className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" disabled={idx === allCategories.length - 1} onClick={() => moveItem(allCategories, idx, 'down', ['categories'])}><ChevronDown className="h-4 w-4" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 border-t flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${cat.isUnderMaintenance ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                        {cat.isUnderMaintenance ? <Hammer className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black">حالة العرض</p>
                                        <p className="text-[10px] text-muted-foreground">{cat.isUnderMaintenance ? 'تحت الصيانة' : 'متاح للجميع'}</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={cat.isUnderMaintenance} 
                                    onCheckedChange={(val) => updateDocumentNonBlocking(doc(firestore!, 'categories', cat.id), { isUnderMaintenance: val })} 
                                />
                            </CardContent>
                            <CardFooter className="p-3 border-t flex gap-2">
                                <Button 
                                    variant="secondary" 
                                    className="flex-1 rounded-xl font-bold" 
                                    onClick={() => { 
                                        setSelectedMainId(cat.parentId || cat.id); 
                                        if(cat.parentId) setSelectedSubId(cat.id);
                                        else setSelectedSubId('');
                                        setActiveTab('items'); 
                                    }}
                                >
                                    إدارة المحتوى
                                </Button>
                                <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                {isAdmin && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:bg-destructive/10" 
                                        onClick={() => confirm("هل أنت متأكد من حذف القسم نهائياً؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="items" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <Card className="xl:col-span-5 rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 pb-4 bg-primary text-primary-foreground">
                            <CardTitle className="text-2xl font-black flex items-center gap-3">
                                <Plus className="h-6 w-6" /> إضافة محتوى جديد
                            </CardTitle>
                            <CardDescription className="text-primary-foreground/70">اختر القسم ثم املأ البيانات المطلوبة</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black flex items-center gap-2 px-1 text-muted-foreground">القسم الرئيسي</label>
                                    <Select value={selectedMainId} onValueChange={(v) => { setSelectedMainId(v); setSelectedSubId(''); }}>
                                        <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="اختر القسم الرئيسي..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {mainCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {subCategories.length > 0 && (
                                    <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                                        <label className="text-xs font-black flex items-center gap-2 px-1 text-muted-foreground">القسم الفرعي (اختياري)</label>
                                        <Select value={selectedSubId} onValueChange={setSelectedSubId}>
                                            <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="اختر قسم فرعي..." /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="">-- لا يوجد --</SelectItem>
                                                {subCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {effectiveCategoryId && (
                                <Form {...itemForm}>
                                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-5 pt-4 border-t-2 border-dashed">
                                        <div className="bg-primary/5 p-4 rounded-2xl flex items-center gap-3 border border-primary/10">
                                            <div className="p-2 bg-primary text-primary-foreground rounded-lg"><Tag className="h-4 w-4" /></div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground">نمط العرض الحالي</p>
                                                <p className="text-xs font-black text-primary">{targetCategory?.displayStyle || 'style1'}</p>
                                            </div>
                                        </div>

                                        <FormField control={itemForm.control} name="title" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black text-sm">عنوان المنشور</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" placeholder="مثلاً: ملحقات فوتوشوب احترافية" /></FormControl></FormItem>
                                        )} />
                                        
                                        <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black text-sm">رابط صورة المعاينة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" dir="ltr" placeholder="https://..." /></FormControl></FormItem>
                                        )} />

                                        {/* Dynamic Fields based on Style */}
                                        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
                                            {itemForm.watch('displayStyle') === 'style3' && (
                                                <>
                                                    <FormField control={itemForm.control} name="prompt" render={({ field }) => (
                                                        <FormItem><FormLabel className="font-black text-sm text-primary">نص البرومبت</FormLabel><FormControl><Textarea {...field} className="h-24 rounded-xl font-mono text-xs" dir="ltr" /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={itemForm.control} name="instructions" render={({ field }) => (
                                                        <FormItem><FormLabel className="font-black text-sm">تعليمات الاستخدام</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                                    )} />
                                                </>
                                            )}

                                            {itemForm.watch('displayStyle') === 'style4' && (
                                                <FormField control={itemForm.control} name="videoUrl" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-black text-sm text-primary">رابط الفيديو (YouTube/Direct)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}

                                            {itemForm.watch('displayStyle') === 'style6' && (
                                                <FormField control={itemForm.control} name="instructions" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-black text-sm">وصف الموقع القصير</FormLabel><FormControl><Textarea {...field} className="h-20 rounded-xl" placeholder="اكتب نبذة عن الموقع هنا..." /></FormControl></FormItem>
                                                )} />
                                            )}

                                            <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (
                                                <FormItem><FormLabel className="font-black text-sm">رابط التحميل أو الموقع</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" dir="ltr" placeholder="https://..." /></FormControl></FormItem>
                                            )} />
                                        </div>

                                        <div className="flex gap-4">
                                            <FormField control={itemForm.control} name="visibility" render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel className="font-black text-sm">من يراه؟</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="public">الجميع (مجاني)</SelectItem>
                                                            <SelectItem value="pro">مشتركي برو فقط</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={itemForm.control} name="isNew" render={({ field }) => (
                                                <FormItem className="flex items-center justify-between p-4 border-2 rounded-xl bg-green-50/30">
                                                    <FormLabel className="font-black m-0 text-xs">وسم جديد</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>

                                        <Button type="submit" className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20" disabled={itemForm.formState.isSubmitting}>
                                            <Send className="ml-2 h-5 w-5" /> نشر المحتوى الآن
                                        </Button>
                                    </form>
                                </Form>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="xl:col-span-7 rounded-[2.5rem] bg-muted/10 border-none overflow-hidden">
                        <CardHeader className="p-8 flex-row items-center justify-between"><CardTitle className="text-xl font-black">قائمة المحتوى المضاف</CardTitle><Badge className="font-bold">{currentItems.length} عنصر</Badge></CardHeader>
                        <CardContent className="p-8 pt-0">
                            <ScrollArea className="h-[750px] space-y-4">
                                {!effectiveCategoryId ? (
                                    <div className="text-center py-20 opacity-30"><Layers className="h-20 w-20 mx-auto mb-4" /><p className="font-black">اختر قسماً لعرض محتوياته وإدارتها</p></div>
                                ) : currentItems.length === 0 ? (
                                    <div className="text-center py-20 opacity-30"><FileText className="h-20 w-20 mx-auto mb-4" /><p className="font-black">هذا القسم فارغ حالياً</p></div>
                                ) : (
                                    <div className="space-y-3">
                                        {currentItems.map((item, idx) => (
                                            <div key={item.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border shadow-sm group hover:shadow-md transition-all">
                                                <div className="flex flex-col bg-muted/50 rounded-lg">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveItem(currentItems, idx, 'up', ['categories', effectiveCategoryId, 'items'])}><ChevronUp className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === currentItems.length - 1} onClick={() => moveItem(currentItems, idx, 'down', ['categories', effectiveCategoryId, 'items'])}><ChevronDown className="h-4 w-4" /></Button>
                                                </div>
                                                <div className="h-14 w-14 rounded-xl overflow-hidden border-2 border-muted shadow-inner relative shrink-0">
                                                    {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover h-full w-full" />}
                                                    {item.visibility === 'pro' && <div className="absolute top-0 right-0 bg-yellow-500 text-white p-0.5 rounded-bl-lg shadow-sm"><Zap className="h-2.5 w-2.5 fill-white" /></div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm leading-tight truncate">{item.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[8px] py-0">{item.displayStyle}</Badge>
                                                        {item.isNew && <Badge className="bg-green-500 text-white text-[8px] py-0 border-none">جديد</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="text-primary h-9 w-9 hover:bg-primary/10"><Edit2 className="h-4 w-4" /></Button>
                                                    {isAdmin && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-destructive h-9 w-9 hover:bg-destructive/10" 
                                                            onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'categories', effectiveCategoryId, 'items', item.id))}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </main>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(o) => !o && setEditingCategory(null)}>
          <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl" dir="rtl">
              <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-3">
                      <Settings className="text-primary h-6 w-6" /> إعدادات القسم
                  </DialogTitle>
                  <DialogDescription>تأكد من اختيار النمط والمستوى المناسب للقسم.</DialogDescription>
              </DialogHeader>
              <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-6 pt-4">
                      <FormField control={catForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel className="font-black text-sm">اسم القسم المعروض</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                      )} />
                      
                      <FormField control={catForm.control} name="fileTypes" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black text-sm flex items-center gap-2"><FileCode className="h-4 w-4 text-primary" /> صيغ الملفات (PSD, AI...)</FormLabel>
                              <FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" placeholder="مثلاً: ZIP, PSD, AI" /></FormControl>
                          </FormItem>
                      )} />

                      <FormField control={catForm.control} name="parentId" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black text-sm">القسم الأب (اختياري)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                                  <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="جعله قسماً رئيسياً" /></SelectTrigger></FormControl>
                                  <SelectContent className="rounded-xl">
                                      <SelectItem value="null">-- قسم رئيسي --</SelectItem>
                                      {mainCategories.filter(c => c.id !== editingCategory?.id).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )} />

                      <FormField control={catForm.control} name="displayStyle" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black text-sm">نمط عرض المحتوى الافتراضي</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="rounded-xl">
                                      <SelectItem value="style1">تحميل (Style 1)</SelectItem>
                                      <SelectItem value="style2">شبكي (Style 2)</SelectItem>
                                      <SelectItem value="style3">برومبت (Style 3)</SelectItem>
                                      <SelectItem value="style4">فيديو (Style 4)</SelectItem>
                                      <SelectItem value="style5">معرض (Style 5)</SelectItem>
                                      <SelectItem value="style6">موقع (Style 6)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )} />

                      <FormField control={catForm.control} name="visibility" render={({ field }) => (
                          <FormItem>
                              <FormLabel className="font-black text-sm">مستوى الوصول</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className="rounded-xl">
                                      <SelectItem value="public">متاح للجميع</SelectItem>
                                      <SelectItem value="pro">للمشتركين فقط</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                      )} />

                      <DialogFooter className="pt-4">
                          <Button type="submit" className="w-full h-14 font-black text-lg rounded-2xl shadow-xl shadow-primary/20">حفظ كافة التغييرات</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
