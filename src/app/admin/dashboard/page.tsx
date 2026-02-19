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
    CheckCircle, 
    Loader2,
    LayoutDashboard,
    Layers,
    Send,
    Hammer,
    FileCode,
    ChevronUp,
    ChevronDown,
    Zap,
    PlayCircle,
    Type,
    Globe,
    CreditCard,
    ArrowRight
} from 'lucide-react';

import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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

import type { Category, ContentItem, PricingPlan } from '@/lib/definitions';

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
    name: z.string().min(2),
    price: z.string(),
    currency: z.string().default('$'),
    description: z.string(),
    features: z.string(),
    isFeatured: z.boolean().default(false),
    enabled: z.boolean().default(true),
    order: z.number().default(0),
});

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('categories');
  
  const [selectedMainId, setSelectedMainId] = useState<string>('');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);

  // Categories
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

  // Items
  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !effectiveCategoryId) return null;
      return query(collection(firestore, 'categories', effectiveCategoryId, 'items'));
  }, [firestore, effectiveCategoryId]);
  const { data: rawItems } = useCollection<ContentItem>(itemsQuery);
  const currentItems = useMemo(() => {
      if (!rawItems) return [];
      return [...rawItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawItems]);

  // Plans
  const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans')) : null, [firestore]);
  const { data: rawPlans } = useCollection<PricingPlan>(plansQuery);
  const allPlans = useMemo(() => {
      if (!rawPlans) return [];
      return [...rawPlans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [rawPlans]);

  // Forms
  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', visibility: 'public', isNew: false }
  });

  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null }
  });

  const planForm = useForm<z.infer<typeof planSchema>>({
      resolver: zodResolver(planSchema),
      defaultValues: { name: '', price: '', currency: '$', description: '', features: '', isFeatured: false, enabled: true, order: 0 }
  });

  // Handlers
  const onAddItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !effectiveCategoryId) return;
    try {
      const itemData = { 
          ...values, 
          order: currentItems.length, 
          createdAt: serverTimestamp(), 
          status: isAdmin ? 'approved' : 'pending' 
      };
      await addDocumentNonBlocking(collection(firestore, 'categories', effectiveCategoryId, 'items'), itemData);
      toast({ title: isAdmin ? "تم النشر بنجاح" : "تم الإرسال للمراجعة" });
      itemForm.reset({ ...itemForm.getValues(), title: '', imageUrl: '', downloadUrl: '', prompt: '', videoUrl: '' });
    } catch (e) {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
    }
  };

  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          const dataToSave = {
              ...values,
              parentId: values.parentId === 'null' ? null : values.parentId,
              order: isNew ? allCategories.length : (editingCategory!.order ?? 0),
              createdAt: isNew ? serverTimestamp() : (editingCategory!.createdAt || serverTimestamp())
          };
          await setDoc(doc(firestore, 'categories', catId), dataToSave, { merge: true });
          toast({ title: "تم حفظ القسم" });
          setEditingCategory(null);
      } catch (e) {
          toast({ title: "خطأ في الحفظ", variant: "destructive" });
      }
  };

  const onUpdatePlan = async (values: z.infer<typeof planSchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingPlan?.id;
          const planId = isNew ? doc(collection(firestore, 'pricingPlans')).id : editingPlan!.id;
          const dataToSave = {
              ...values,
              features: values.features.split(',').map(f => f.trim()),
              order: isNew ? allPlans.length : values.order,
          };
          await setDoc(doc(firestore, 'pricingPlans', planId), dataToSave, { merge: true });
          toast({ title: "تم حفظ الخطة" });
          setEditingPlan(null);
      } catch (e) {
          toast({ title: "خطأ في حفظ الخطة", variant: "destructive" });
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

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen bg-secondary/30" dir="rtl">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-card border-l sticky top-0 h-screen shadow-xl z-50">
        <div className="p-8 border-b flex flex-col items-center gap-3">
            <div className="bg-primary text-primary-foreground p-4 rounded-[2rem] shadow-2xl rotate-3">
                <LayoutDashboard className="h-8 w-8" />
            </div>
            <h1 className="font-black text-xl">لوحة التحكم</h1>
        </div>
        <ScrollArea className="flex-1 px-4 py-6">
            <nav className="space-y-2">
                {[
                    { id: 'categories', label: 'الأقسام', icon: Layers },
                    { id: 'items', label: 'المحتوى', icon: Send },
                    { id: 'plans', label: 'الاشتراكات', icon: CreditCard },
                ].map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id)} 
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-primary/5'}`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </ScrollArea>
        <div className="p-6 border-t">
            <Button variant="outline" className="w-full rounded-2xl font-bold gap-2" onClick={() => router.push('/home')}>
                <ArrowRight className="h-4 w-4" /> العودة للتطبيق
            </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-10">
        <Tabs value={activeTab} className="space-y-8">
            
            {/* Categories Management */}
            <TabsContent value="categories" className="space-y-8">
                <div className="flex justify-between items-center bg-card p-6 rounded-[2rem] shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-foreground">إدارة الأقسام</h2>
                        <p className="text-xs text-muted-foreground mt-1">أضف الأقسام الرئيسية والفرعية وحدد أنماط العرض</p>
                    </div>
                    <Button size="lg" className="rounded-2xl font-black px-8" onClick={() => { catForm.reset(); setEditingCategory({ id: '' } as any); }}>
                        <Plus className="ml-2 h-5 w-5" /> إضافة قسم
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allCategories.map((cat, idx) => (
                        <Card key={cat.id} className="overflow-hidden border-none shadow-lg rounded-[2.5rem] group">
                            <CardHeader className="p-6 bg-muted/20 flex-row justify-between items-start space-y-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-black">{cat.name}</CardTitle>
                                        {cat.parentId && <Badge variant="outline" className="text-[9px] h-5">فرعي</Badge>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge variant="secondary" className="text-[9px] font-bold">النمط: {cat.displayStyle}</Badge>
                                        {cat.fileTypes && <Badge className="bg-primary/10 text-primary text-[9px] border-none font-bold uppercase">{cat.fileTypes}</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 bg-background/50 p-1 rounded-xl border">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveItem(allCategories, idx, 'up', ['categories'])}><ChevronUp className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === allCategories.length - 1} onClick={() => moveItem(allCategories, idx, 'down', ['categories'])}><ChevronDown className="h-4 w-4" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex items-center justify-between border-t border-dashed">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${cat.isUnderMaintenance ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                        {cat.isUnderMaintenance ? <Hammer className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black">حالة القسم</p>
                                        <p className="text-[9px] text-muted-foreground">{cat.isUnderMaintenance ? 'تحت الصيانة' : 'نشط للجمهور'}</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={cat.isUnderMaintenance} 
                                    onCheckedChange={(val) => updateDocumentNonBlocking(doc(firestore!, 'categories', cat.id), { isUnderMaintenance: val })} 
                                />
                            </CardContent>
                            <CardFooter className="p-4 bg-muted/5 flex gap-2">
                                <Button variant="secondary" className="flex-1 rounded-xl font-bold h-10 text-xs" onClick={() => { setSelectedMainId(cat.parentId || cat.id); if(cat.parentId) setSelectedSubId(cat.id); else setSelectedSubId(''); setActiveTab('items'); }}>إدارة المحتوى</Button>
                                <Button variant="ghost" size="icon" className="text-primary h-10 w-10 hover:bg-primary/10" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                {isAdmin && (
                                    <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-destructive/10" onClick={() => confirm("حذف القسم؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            {/* Content Management */}
            <TabsContent value="items" className="space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    <Card className="xl:col-span-5 rounded-[2.5rem] border-none shadow-2xl overflow-hidden sticky top-10">
                        <CardHeader className="p-8 bg-primary text-primary-foreground">
                            <CardTitle className="text-xl font-black flex items-center gap-3"><Plus className="h-6 w-6" /> نشر محتوى جديد</CardTitle>
                            <CardDescription className="text-primary-foreground/70">تظهر الحقول حسب نمط القسم المختار</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-muted-foreground px-1">القسم الرئيسي</label>
                                    <Select value={selectedMainId} onValueChange={(v) => { setSelectedMainId(v); setSelectedSubId(''); }}>
                                        <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {mainCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {subCategories.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-muted-foreground px-1">القسم الفرعي</label>
                                        <Select value={selectedSubId} onValueChange={setSelectedSubId}>
                                            <SelectTrigger className="h-12 rounded-xl border-2"><SelectValue placeholder="اختياري..." /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="none">-- لا يوجد --</SelectItem>
                                                {subCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {effectiveCategoryId && targetCategory && (
                                <Form {...itemForm}>
                                    <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-5 pt-6 border-t-2 border-dashed">
                                        <div className="bg-primary/5 p-4 rounded-2xl border flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary text-primary-foreground p-2 rounded-xl"><Type className="h-4 w-4" /></div>
                                                <div><p className="text-[10px] font-black">النمط الحالي</p><p className="text-[10px] text-muted-foreground">{targetCategory.displayStyle}</p></div>
                                            </div>
                                            <Badge className="font-bold">{targetCategory.displayStyle}</Badge>
                                        </div>

                                        <FormField control={itemForm.control} name="title" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black text-xs">عنوان المنشور</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" placeholder="مثلاً: ملحقات فوتوشوب 2024" /></FormControl></FormItem>
                                        )} />
                                        
                                        <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                                            <FormItem><FormLabel className="font-black text-xs">رابط الصورة المعروضة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" placeholder="https://..." /></FormControl></FormItem>
                                        )} />

                                        <div className="space-y-5">
                                            {targetCategory.displayStyle === 'style3' && (
                                                <>
                                                    <FormField control={itemForm.control} name="prompt" render={({ field }) => (
                                                        <FormItem><FormLabel className="font-black text-xs text-primary">نص البرومبت</FormLabel><FormControl><Textarea {...field} className="h-24 rounded-xl font-mono text-xs" dir="ltr" /></FormControl></FormItem>
                                                    )} />
                                                    <FormField control={itemForm.control} name="instructions" render={({ field }) => (
                                                        <FormItem><FormLabel className="font-black text-xs">تعليمات الاستخدام</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                                    )} />
                                                </>
                                            )}

                                            {targetCategory.displayStyle === 'style4' && (
                                                <FormField control={itemForm.control} name="videoUrl" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-black text-xs text-primary">رابط الفيديو (يوتيوب)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}

                                            {targetCategory.displayStyle === 'style6' && (
                                                <FormField control={itemForm.control} name="instructions" render={({ field }) => (
                                                    <FormItem><FormLabel className="font-black text-xs">وصف الموقع</FormLabel><FormControl><Textarea {...field} className="h-20 rounded-xl" placeholder="اكتب نبذة عن الموقع..." /></FormControl></FormItem>
                                                )} />
                                            )}

                                            <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (
                                                <FormItem><FormLabel className="font-black text-xs">رابط التحميل أو الزيارة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" placeholder="https://..." /></FormControl></FormItem>
                                            )} />
                                        </div>

                                        <div className="flex gap-4">
                                            <FormField control={itemForm.control} name="visibility" render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel className="font-black text-xs">مستوى الوصول</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="public">عام (مجاني)</SelectItem>
                                                            <SelectItem value="pro">برو فقط</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={itemForm.control} name="isNew" render={({ field }) => (
                                                <FormItem className="flex items-center justify-between p-4 border-2 rounded-xl bg-green-50/20">
                                                    <FormLabel className="font-black m-0 text-[10px]">شارة جديد</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>

                                        <Button type="submit" className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20" disabled={itemForm.formState.isSubmitting}>
                                            <Send className="ml-2 h-5 w-5" /> نشر الآن
                                        </Button>
                                    </form>
                                </Form>
                            )}
                        </CardContent>
                    </Card>

                    <div className="xl:col-span-7 space-y-6">
                        <Card className="rounded-[2.5rem] bg-card border-none shadow-sm overflow-hidden">
                            <CardHeader className="p-8 flex-row items-center justify-between border-b">
                                <div><CardTitle className="text-lg font-black">المحتوى الحالي</CardTitle><p className="text-[10px] text-muted-foreground">ترتيب العناصر في القسم المختار</p></div>
                                <Badge variant="secondary" className="font-black h-8 px-4 rounded-full">{currentItems.length} منشور</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[750px]">
                                    {!effectiveCategoryId ? (
                                        <div className="text-center py-32 opacity-30"><Layers className="h-20 w-20 mx-auto mb-4" /><p className="font-black">اختر قسماً لعرض محتوياته</p></div>
                                    ) : currentItems.length === 0 ? (
                                        <div className="text-center py-32 opacity-30"><Send className="h-20 w-20 mx-auto mb-4" /><p className="font-black">هذا القسم فارغ حالياً</p></div>
                                    ) : (
                                        <div className="divide-y">
                                            {currentItems.map((item, idx) => (
                                                <div key={item.id} className="flex items-center gap-4 p-5 group hover:bg-primary/5 transition-colors">
                                                    <div className="flex flex-col bg-muted/50 rounded-xl overflow-hidden border">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 rounded-none" disabled={idx === 0} onClick={() => moveItem(currentItems, idx, 'up', ['categories', effectiveCategoryId, 'items'])}><ChevronUp className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 rounded-none" disabled={idx === currentItems.length - 1} onClick={() => moveItem(currentItems, idx, 'down', ['categories', effectiveCategoryId, 'items'])}><ChevronDown className="h-4 w-4" /></Button>
                                                    </div>
                                                    <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-muted relative shrink-0">
                                                        {item.imageUrl && <img src={item.imageUrl} alt="" className="object-cover h-full w-full" />}
                                                        {item.visibility === 'pro' && <div className="absolute top-0 right-0 bg-yellow-500 text-white p-1 rounded-bl-xl shadow-sm"><Zap className="h-3 w-3 fill-white" /></div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate">{item.title}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            {item.isNew && <Badge className="bg-green-500 text-white text-[8px] h-4 border-none">جديد</Badge>}
                                                            <Badge variant="outline" className="text-[8px] h-4 py-0">{item.visibility}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isAdmin && (
                                                            <Button 
                                                                variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-destructive/10" 
                                                                onClick={() => confirm("حذف العنصر؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', effectiveCategoryId, 'items', item.id))}
                                                            ><Trash2 className="h-4 w-4" /></Button>
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
                </div>
            </TabsContent>

            {/* Pricing Plans */}
            <TabsContent value="plans" className="space-y-8">
                <div className="flex justify-between items-center bg-card p-6 rounded-[2rem] shadow-sm">
                    <h2 className="text-2xl font-black text-foreground">إدارة الباقات</h2>
                    <Button size="lg" className="rounded-2xl font-black" onClick={() => { planForm.reset(); setEditingPlan({ id: '' } as any); }}>
                        <Plus className="ml-2 h-5 w-5" /> إضافة باقة
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allPlans.map((plan, idx) => (
                        <Card key={plan.id} className={`rounded-[2.5rem] border-none shadow-lg overflow-hidden ${plan.isFeatured ? 'ring-4 ring-primary/20' : ''}`}>
                            <CardHeader className="p-6 bg-muted/20">
                                <div className="flex justify-between items-start">
                                    <div><CardTitle className="font-black text-xl">{plan.name}</CardTitle><CardDescription className="text-xs">{plan.description}</CardDescription></div>
                                    {plan.isFeatured && <Badge className="bg-primary text-white font-bold">Featured</Badge>}
                                </div>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-3xl font-black">{plan.price}</span>
                                    <span className="text-sm font-bold text-muted-foreground">{plan.currency}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 h-40">
                                <ul className="space-y-2">
                                    {plan.features.slice(0, 4).map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CheckCircle className="h-3 w-3 text-green-500" /> {f}</li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="p-4 border-t flex gap-2">
                                <Button variant="ghost" size="icon" className="text-primary h-10 w-10" onClick={() => { setEditingPlan(plan); planForm.reset({ ...plan, features: plan.features.join(', ') }); }}><Edit2 className="h-4 w-4" /></Button>
                                {isAdmin && (
                                    <Button variant="ghost" size="icon" className="text-destructive h-10 w-10" onClick={() => confirm("حذف الباقة؟") && deleteDocumentNonBlocking(doc(firestore!, 'pricingPlans', plan.id))}><Trash2 className="h-4 w-4" /></Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <Dialog open={!!editingCategory} onOpenChange={(o) => !o && setEditingCategory(null)}>
          <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl" dir="rtl">
              <DialogHeader><DialogTitle className="text-2xl font-black flex items-center gap-3"><Settings className="text-primary h-6 w-6" /> إعدادات القسم</DialogTitle></DialogHeader>
              <Form {...catForm}>
                  <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-6 pt-4">
                      <FormField control={catForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">اسم القسم</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <FormField control={catForm.control} name="fileTypes" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs flex items-center gap-2"><FileCode className="h-4 w-4 text-primary" /> صيغ الملفات (مثل: PSD, AI)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>)} />
                      <FormField control={catForm.control} name="parentId" render={({ field }) => (
                          <FormItem><FormLabel className="font-black text-xs">القسم الأب (اختياري)</FormLabel><Select onValueChange={field.onChange} value={field.value || 'null'}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="null">-- قسم رئيسي --</SelectItem>{mainCategories.filter(c => c.id !== editingCategory?.id).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={catForm.control} name="displayStyle" render={({ field }) => (
                          <FormItem><FormLabel className="font-black text-xs">نمط عرض المحتوى</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="style1">تحميل (Style 1)</SelectItem><SelectItem value="style3">برومبت (Style 3)</SelectItem><SelectItem value="style4">فيديو (Style 4)</SelectItem><SelectItem value="style5">معرض (Style 5)</SelectItem><SelectItem value="style6">موقع (Style 6)</SelectItem></Select></FormItem>
                      )} />
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-14 font-black text-lg rounded-2xl shadow-xl shadow-primary/20">حفظ التغييرات</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={(o) => !o && setEditingPlan(null)}>
          <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl" dir="rtl">
              <DialogHeader><DialogTitle className="text-2xl font-black">إدارة باقة الاشتراك</DialogTitle></DialogHeader>
              <Form {...planForm}>
                  <form onSubmit={planForm.handleSubmit(onUpdatePlan)} className="space-y-4 pt-4">
                      <FormField control={planForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">اسم الباقة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={planForm.control} name="price" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">السعر</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-center" /></FormControl></FormItem>)} />
                          <FormField control={planForm.control} name="currency" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">العملة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-center" /></FormControl></FormItem>)} />
                      </div>
                      <FormField control={planForm.control} name="description" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">وصف قصير</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>)} />
                      <FormField control={planForm.control} name="features" render={({ field }) => (<FormItem><FormLabel className="font-black text-xs">المميزات (افصل بينها بفاصلة ,)</FormLabel><FormControl><Textarea {...field} className="h-20 rounded-xl" /></FormControl></FormItem>)} />
                      <div className="flex gap-4">
                          <FormField control={planForm.control} name="isFeatured" render={({ field }) => (<FormItem className="flex-1 flex items-center justify-between p-3 border-2 rounded-xl"><FormLabel className="m-0 font-black text-[10px]">باقة مميزة</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                          <FormField control={planForm.control} name="enabled" render={({ field }) => (<FormItem className="flex-1 flex items-center justify-between p-3 border-2 rounded-xl"><FormLabel className="m-0 font-black text-[10px]">مفعلة</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      </div>
                      <DialogFooter className="pt-4"><Button type="submit" className="w-full h-14 font-black rounded-2xl shadow-xl">حفظ الباقة</Button></DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
