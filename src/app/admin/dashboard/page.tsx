'use client';
import { useState, useMemo } from 'react';
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
    Hammer,
    FileCode,
    ChevronUp,
    ChevronDown,
    Zap,
    Type,
    CreditCard,
    ArrowRight,
    LayoutGrid,
    Eye,
    ChevronLeft,
    Monitor
} from 'lucide-react';

import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { Category, ContentItem, PricingPlan } from '@/lib/definitions';

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

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTool, setActiveTool] = useState<'content' | 'plans' | 'settings'>('content');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Categories Fetching
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  
  const allCategories = useMemo(() => {
      if (!rawCategories) return [];
      return [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawCategories]);

  const mainCategories = useMemo(() => allCategories.filter(c => !c.parentId), [allCategories]);
  
  const currentCategory = useMemo(() => 
    selectedParentId ? allCategories.find(c => c.id === selectedParentId) : null
  , [selectedParentId, allCategories]);

  const subCategories = useMemo(() => {
      if (!selectedParentId) return [];
      return allCategories.filter(c => c.parentId === selectedParentId);
  }, [allCategories, selectedParentId]);

  // Items Fetching
  const itemsQuery = useMemoFirebase(() => {
      if (!firestore || !selectedParentId) return null;
      return query(collection(firestore, 'categories', selectedParentId, 'items'));
  }, [firestore, selectedParentId]);
  const { data: rawItems } = useCollection<ContentItem>(itemsQuery);
  const currentItems = useMemo(() => {
      if (!rawItems) return [];
      return [...rawItems].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [rawItems]);

  // Forms
  const catForm = useForm<z.infer<typeof categorySchema>>({
      resolver: zodResolver(categorySchema),
      defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null }
  });

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', visibility: 'public', isNew: false }
  });

  // Handlers
  const onUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
      if (!firestore) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          const dataToSave = {
              ...values,
              parentId: values.parentId || null,
              order: isNew ? allCategories.length : (editingCategory!.order ?? 0),
              createdAt: isNew ? serverTimestamp() : (editingCategory!.createdAt || serverTimestamp())
          };
          await setDoc(doc(firestore, 'categories', catId), dataToSave, { merge: true });
          toast({ title: "تم حفظ القسم بنجاح" });
          setEditingCategory(null);
          catForm.reset();
      } catch (e) {
          toast({ title: "خطأ في الحفظ", variant: "destructive" });
      }
  };

  const onAddItem = async (values: z.infer<typeof itemSchema>) => {
    if (!firestore || !selectedParentId) return;
    try {
      const itemData = { 
          ...values, 
          order: currentItems.length, 
          createdAt: serverTimestamp(), 
          status: isAdmin ? 'approved' : 'pending' 
      };
      await addDocumentNonBlocking(collection(firestore, 'categories', selectedParentId, 'items'), itemData);
      toast({ title: isAdmin ? "تم النشر بنجاح" : "تم الإرسال للمراجعة" });
      itemForm.reset();
      setIsAddingItem(false);
    } catch (e) {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
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
    <div className="min-h-screen bg-[#F8F9FC] text-foreground" dir="rtl">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 flex h-20 items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-primary text-primary-foreground p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                    <Monitor className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tight">إدارة المنصة</h1>
                    <p className="text-[10px] text-muted-foreground font-bold opacity-60">لوحة التحكم المركزية</p>
                </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-2xl border">
                {[
                    { id: 'content', label: 'المحتوى والأقسام', icon: Layers },
                    { id: 'plans', label: 'باقات الاشتراك', icon: CreditCard },
                    { id: 'settings', label: 'الإعدادات العامة', icon: Settings },
                ].map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => { setActiveTool(tool.id as any); setSelectedParentId(null); }}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all",
                            activeTool === tool.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50"
                        )}
                    >
                        <tool.icon className="h-4 w-4" />
                        {tool.label}
                    </button>
                ))}
            </nav>

            <Button variant="ghost" className="rounded-2xl font-black gap-2 text-xs" onClick={() => router.push('/home')}>
                الموقع <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto max-w-6xl px-4 py-8">
        
        {activeTool === 'content' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Header Section */}
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
                        <p className="text-xs text-muted-foreground font-medium">
                            {selectedParentId ? 'تحكم في الأقسام الفرعية والمنشورات داخل هذا القسم' : 'ابدأ باختيار قسم أو أضف قسماً رئيسياً جديداً'}
                        </p>
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
                                <DialogHeader><DialogTitle className="text-xl font-black">إعدادات القسم الجديد</DialogTitle></DialogHeader>
                                <Form {...catForm}>
                                    <form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-5 pt-4">
                                        <FormField control={catForm.control} name="name" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-black">اسم القسم</FormLabel>
                                                <FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={catForm.control} name="fileTypes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-black">الصيغ (اختياري)</FormLabel>
                                                <FormControl><Input {...field} placeholder="PSD, AI, PNG" className="h-12 rounded-xl" /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={catForm.control} name="displayStyle" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-black">نمط العرض</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="style1">تحميل (Style 1)</SelectItem>
                                                        <SelectItem value="style3">برومبت (Style 3)</SelectItem>
                                                        <SelectItem value="style4">فيديو (Style 4)</SelectItem>
                                                        <SelectItem value="style5">معرض (Style 5)</SelectItem>
                                                        <SelectItem value="style6">موقع (Style 6)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black">حفظ التغييرات</Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>

                        {selectedParentId && (
                            <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                                <DialogTrigger asChild>
                                    <Button size="lg" variant="outline" className="rounded-2xl font-black px-6 border-2">
                                        <Send className="ml-2 h-5 w-5" /> إضافة منشور
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-[2.5rem] p-8" dir="rtl">
                                    <DialogHeader><DialogTitle className="text-xl font-black">نشر محتوى جديد</DialogTitle></DialogHeader>
                                    <Form {...itemForm}>
                                        <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-4 pt-4">
                                            <div className="bg-primary/5 p-3 rounded-xl border flex items-center justify-between mb-4">
                                                <span className="text-[10px] font-black opacity-60">النمط المطبق: {currentCategory?.displayStyle}</span>
                                                <Badge variant="outline" className="text-[10px]">{currentCategory?.displayStyle}</Badge>
                                            </div>
                                            <FormField control={itemForm.control} name="title" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">العنوان</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl" /></FormControl></FormItem>
                                            )} />
                                            <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">رابط الصورة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                            )} />
                                            
                                            {currentCategory?.displayStyle === 'style3' && (
                                                <FormField control={itemForm.control} name="prompt" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-xs font-black">نص البرومبت</FormLabel><FormControl><Textarea {...field} className="rounded-xl font-mono text-xs" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}
                                            {currentCategory?.displayStyle === 'style4' && (
                                                <FormField control={itemForm.control} name="videoUrl" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-xs font-black">رابط يوتيوب</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                                )} />
                                            )}
                                            
                                            <FormField control={itemForm.control} name="downloadUrl" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-black">رابط التحميل / الزيارة</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl text-left" dir="ltr" /></FormControl></FormItem>
                                            )} />

                                            <div className="flex gap-4 pt-2">
                                                <FormField control={itemForm.control} name="visibility" render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel className="text-xs font-black">الوصول</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent className="rounded-xl">
                                                                <SelectItem value="public">مجاني</SelectItem>
                                                                <SelectItem value="pro">برو</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={itemForm.control} name="isNew" render={({ field }) => (
                                                    <FormItem className="flex flex-col justify-end p-2 border rounded-xl bg-muted/30">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black">جديد</span>
                                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                        </div>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <Button type="submit" className="w-full h-14 rounded-2xl font-black mt-4">نشر الآن</Button>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {!selectedParentId ? (
                    /* Main Categories Grid */
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
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); moveItem(mainCategories, idx, 'up', ['categories']); }} disabled={idx === 0}><ChevronUp className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); moveItem(mainCategories, idx, 'down', ['categories']); }} disabled={idx === mainCategories.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-xl", cat.isUnderMaintenance ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                                                {cat.isUnderMaintenance ? <Hammer className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black">حالة القسم</p>
                                                <p className="text-[9px] text-muted-foreground font-medium">{cat.isUnderMaintenance ? 'تحت الصيانة' : 'نشط حالياً'}</p>
                                            </div>
                                        </div>
                                        <Switch checked={cat.isUnderMaintenance} onCheckedChange={(v) => updateDocumentNonBlocking(doc(firestore!, 'categories', cat.id), { isUnderMaintenance: v })} />
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 bg-muted/30 flex gap-2">
                                    <Button className="flex-1 rounded-xl font-black h-11 text-xs" onClick={() => setSelectedParentId(cat.id)}>
                                        إدارة القسم <ChevronLeft className="mr-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-primary hover:bg-primary/10" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                    {isAdmin && (
                                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => confirm("حذف القسم؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    /* Detailed Category Management */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Sub-categories Column */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-sm flex items-center gap-2 text-primary">
                                    <Layers className="h-4 w-4" /> الأقسام الفرعية
                                </h3>
                                <Badge variant="secondary" className="font-bold">{subCategories.length}</Badge>
                            </div>
                            
                            <div className="space-y-3">
                                {subCategories.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed opacity-40">
                                        <p className="text-xs font-bold">لا توجد أقسام فرعية</p>
                                    </div>
                                ) : (
                                    subCategories.map((sub, idx) => (
                                        <div key={sub.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border group">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-secondary p-2 rounded-lg"><LayoutGrid className="h-4 w-4 opacity-40" /></div>
                                                <span className="font-black text-sm">{sub.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingCategory(sub); catForm.reset(sub); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                                                {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', sub.id))}><Trash2 className="h-3.5 w-3.5" /></Button>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Items Column */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-sm flex items-center gap-2 text-primary">
                                    <Send className="h-4 w-4" /> المحتوى الحالي
                                </h3>
                                <Badge variant="secondary" className="font-bold">{currentItems.length} منشور</Badge>
                            </div>

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
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => moveItem(currentItems, idx, 'up', ['categories', selectedParentId!, 'items'])}><ChevronUp className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === currentItems.length - 1} onClick={() => moveItem(currentItems, idx, 'down', ['categories', selectedParentId!, 'items'])}><ChevronDown className="h-4 w-4" /></Button>
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
                                                        {isAdmin && <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-destructive/10" onClick={() => confirm("حذف؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedParentId!, 'items', item.id))}><Trash2 className="h-4 w-4" /></Button>}
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
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-20 opacity-40">
                <CreditCard className="h-20 w-20 mx-auto mb-4" />
                <h3 className="text-2xl font-black">إدارة الباقات قيد التطوير</h3>
            </div>
        )}

        {activeTool === 'settings' && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-20 opacity-40">
                <Settings className="h-20 w-20 mx-auto mb-4" />
                <h3 className="text-2xl font-black">الإعدادات العامة قيد التطوير</h3>
            </div>
        )}

      </main>
    </div>
  );
}
