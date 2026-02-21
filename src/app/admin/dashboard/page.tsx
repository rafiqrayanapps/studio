'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Plus, Edit2, Trash2, Settings, CheckCircle, Loader2, Layers, Send, ChevronUp, ChevronDown, Zap, CreditCard, ArrowRight, ChevronRight, Monitor, Bell, Palette, FileCode, UserPlus, Users, Wallet, UserCog, ImageIcon, Layout, Hammer, Music, Save, Globe, Check, Clock, Code2, Link2, Share2, Brush, ExternalLink, Package
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, ContentItem, AdsConfig, ThemeConfig, SubscriptionDialogConfig, ShareLinkConfig, RequestDesignConfig, Notification, PricingPlan } from '@/lib/definitions';

const categorySchema = z.object({ 
    name: z.string().min(2, "الاسم مطلوب"), 
    displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5', 'style6', 'style7']).default('style1'), 
    visibility: z.enum(['public', 'pro']).default('public'), 
    isUnderMaintenance: z.boolean().default(false), 
    fileTypes: z.string().optional(), 
    parentId: z.string().nullable().default(null) 
});

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
    isNew: z.boolean().default(false) 
});

const planSchema = z.object({
    name: z.string().min(2, "الاسم مطلوب"),
    price: z.string().min(1, "السعر مطلوب"),
    currency: z.string().default("ر.س"),
    description: z.string().min(5, "الوصف مطلوب"),
    features: z.string().describe("المميزات مفصولة بفاصلة"),
    isFeatured: z.boolean().default(false),
    enabled: z.boolean().default(true),
    link: z.string().optional()
});

export default function AdminDashboard() {
  const { isAdmin, isEditor, isLoading: isUserLoading } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTool, setActiveTool] = useState<'content' | 'plans' | 'settings' | 'notifications'>('content');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: rawCategories } = useCollection<Category>(categoriesQuery);
  
  const allCategories = useMemo(() => rawCategories ? [...rawCategories].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [], [rawCategories]);
  const mainCategories = useMemo(() => allCategories.filter(c => !c.parentId), [allCategories]);
  const currentCategory = useMemo(() => selectedParentId ? allCategories.find(c => c.id === selectedParentId) : null, [selectedParentId, allCategories]);
  const subCategories = useMemo(() => selectedParentId ? allCategories.filter(c => c.parentId === selectedParentId) : [], [allCategories, selectedParentId]);

  const itemsQuery = useMemoFirebase(() => selectedParentId ? query(collection(firestore!, 'categories', selectedParentId, 'items'), orderBy('order', 'asc')) : null, [firestore, selectedParentId]);
  const { data: currentItems = [] } = useCollection<ContentItem>(itemsQuery);

  const catForm = useForm({ resolver: zodResolver(categorySchema), defaultValues: { name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null } });
  const itemForm = useForm({ resolver: zodResolver(itemSchema), defaultValues: { title: '', imageUrl: '', audioUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', appVersion: '', screenshots: '', visibility: 'public', isNew: false } });

  const onUpdateCategory = async (values: any) => {
      if (!firestore || !isAdmin) return;
      try {
          const isNew = !editingCategory?.id;
          const catId = isNew ? doc(collection(firestore, 'categories')).id : editingCategory!.id;
          await setDoc(doc(firestore, 'categories', catId), { 
              ...values, 
              parentId: values.parentId || null, 
              order: isNew ? allCategories.length : (editingCategory!.order ?? 0), 
              createdAt: isNew ? serverTimestamp() : (editingCategory!.createdAt || serverTimestamp()) 
          }, { merge: true });
          toast({ title: "تم الحفظ بنجاح" }); setEditingCategory(null); catForm.reset();
      } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  const onSaveItem = async (values: any) => {
    if (!firestore || !selectedParentId) return;
    try {
      const screenshotsArray = values.screenshots ? values.screenshots.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];
      const itemData: any = { ...values, screenshots: screenshotsArray, updatedAt: serverTimestamp(), status: isAdmin ? 'approved' : 'pending' };
      
      if (editingItem && isAdmin) {
          await setDoc(doc(firestore, 'categories', selectedParentId, 'items', editingItem.id), itemData, { merge: true });
      } else {
          await addDocumentNonBlocking(collection(firestore, 'categories', selectedParentId, 'items'), { ...itemData, order: currentItems.length, createdAt: serverTimestamp() });
      }
      
      toast({ title: isAdmin ? "تم النشر بنجاح" : "تم الإرسال للمراجعة" });
      itemForm.reset(); setIsAddingItem(false); setEditingItem(null);
    } catch (e) { toast({ title: "خطأ في الحفظ", variant: "destructive" }); }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-foreground pb-24" dir="rtl">
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b">
        <div className="container mx-auto max-w-6xl px-4 h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 shrink-0">
                <div className="bg-primary text-primary-foreground p-2 rounded-xl"><Monitor className="h-5 w-5" /></div>
                <h1 className="text-xs font-black hidden sm:block">إدارة المنصة</h1>
            </div>
            
            <ScrollArea className="flex-1 max-w-full">
                <nav className="flex gap-1 bg-secondary/50 p-1 rounded-2xl border whitespace-nowrap">
                    {[
                        { id: 'content', label: 'المحتوى', icon: Layers }, 
                        { id: 'plans', label: 'الباقات', icon: Package },
                        { id: 'settings', label: 'الإعدادات', icon: Settings },
                        { id: 'notifications', label: 'الإشعارات', icon: Bell }
                    ].map(tool => (
                        isAdmin || (tool.id === 'content' && isEditor) ? (
                            <button key={tool.id} onClick={() => { setActiveTool(tool.id as any); setSelectedParentId(null); }} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all", activeTool === tool.id ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/50")}>
                                <tool.icon className="h-3.5 w-3.5" /> {tool.label}
                            </button>
                        ) : null
                    ))}
                </nav>
                <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            <Button variant="ghost" size="sm" onClick={() => router.push('/home')} className="font-black text-[10px] gap-1 shrink-0 px-2">الموقع <ArrowRight className="h-3 w-3" /></Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {activeTool === 'content' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-[2.5rem] border shadow-sm gap-4">
                    <div className="flex items-center gap-4">
                        {selectedParentId && <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedParentId(currentCategory?.parentId || null)}><ChevronRight className="h-6 w-6" /></Button>}
                        <div>
                            <h2 className="text-2xl font-black">{selectedParentId ? currentCategory?.name : 'إدارة المحتوى'}</h2>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1">{selectedParentId ? 'تعديل المحتوى والأقسام الفرعية' : 'تحكم في أقسام الموقع الرئيسية'}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        {isAdmin && !selectedParentId && (
                            <Dialog open={!!editingCategory} onOpenChange={o => !o && setEditingCategory(null)}>
                                <DialogTrigger asChild><Button className="flex-1 sm:flex-none rounded-2xl h-12 px-6 font-black" onClick={() => { catForm.reset({ name: '', displayStyle: 'style1', visibility: 'public', isUnderMaintenance: false, fileTypes: '', parentId: null }); setEditingCategory({id:''} as any); }}><Plus className="ml-2 h-5 w-5" /> قسم جديد</Button></DialogTrigger>
                                <DialogContent className="rounded-[2.5rem] max-w-md" dir="rtl">
                                    <DialogHeader><DialogTitle className="font-black text-xl">إعدادات القسم</DialogTitle></DialogHeader>
                                    <Form {...catForm}><form onSubmit={catForm.handleSubmit(onUpdateCategory)} className="space-y-5 pt-4">
                                        <FormField control={catForm.control} name="name" render={({field})=><FormItem><FormLabel className="text-xs font-black">اسم القسم</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={catForm.control} name="displayStyle" render={({field})=><FormItem><FormLabel className="text-xs font-black">نمط العرض</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl><SelectContent className="rounded-xl">
                                                {['style1','style2','style3','style4','style5','style6','style7'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent></Select></FormItem>} />
                                            <FormField control={catForm.control} name="visibility" render={({field})=><FormItem><FormLabel className="text-xs font-black">الظهور</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="public">عام</SelectItem><SelectItem value="pro">برو فقط</SelectItem></Select></FormItem>} />
                                        </div>
                                        <FormField control={catForm.control} name="fileTypes" render={({field})=><FormItem><FormLabel className="text-xs font-black">صيغ الملفات (مثلاً: PSD, AI)</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                        <FormField control={catForm.control} name="isUnderMaintenance" render={({field})=><FormItem className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border"><div className="space-y-0.5"><FormLabel className="font-black text-xs">وضع الصيانة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>} />
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl">حفظ القسم</Button>
                                    </form></Form>
                                </DialogContent>
                            </Dialog>
                        )}
                        {selectedParentId && (
                            <Dialog open={isAddingItem} onOpenChange={o => { setIsAddingItem(o); if(!o) setEditingItem(null); }}>
                                <DialogTrigger asChild><Button variant="outline" className="flex-1 sm:flex-none rounded-2xl h-12 px-6 font-black border-2"><Send className="ml-2 h-5 w-5" /> منشور جديد</Button></DialogTrigger>
                                <DialogContent className="rounded-[2.5rem] max-w-2xl" dir="rtl">
                                    <DialogHeader><DialogTitle className="font-black text-xl">إضافة محتوى جديد</DialogTitle></DialogHeader>
                                    <ScrollArea className="max-h-[80vh] px-1"><Form {...itemForm}><form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-5 pt-4 pb-6">
                                        <FormField control={itemForm.control} name="title" render={({field})=><FormItem><FormLabel className="text-xs font-black">العنوان</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField control={itemForm.control} name="imageUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط الصورة</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                            <FormField control={itemForm.control} name="downloadUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط التحميل</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField control={itemForm.control} name="audioUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط الصوت (Style 7)</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                            <FormField control={itemForm.control} name="videoUrl" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط الفيديو (Style 4)</FormLabel><FormControl><Input {...field} className="rounded-xl h-12"/></FormControl></FormItem>} />
                                        </div>
                                        <FormField control={itemForm.control} name="prompt" render={({field})=><FormItem><FormLabel className="text-xs font-black">نص البرومبت (Style 3)</FormLabel><FormControl><Textarea {...field} className="rounded-xl" rows={3}/></FormControl></FormItem>} />
                                        <FormField control={itemForm.control} name="screenshots" render={({field})=><FormItem><FormLabel className="text-xs font-black">روابط المعرض (Style 5 - مفصولة بفاصلة)</FormLabel><FormControl><Textarea {...field} className="rounded-xl" rows={2}/></FormControl></FormItem>} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={itemForm.control} name="visibility" render={({field})=><FormItem><FormLabel className="text-xs font-black">الظهور</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="rounded-xl h-12"><SelectValue/></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="public">عام</SelectItem><SelectItem value="pro">برو فقط</SelectItem></Select></FormItem>} />
                                            <FormField control={itemForm.control} name="isNew" render={({field})=><FormItem className="flex items-center justify-between p-3 border rounded-xl h-12"><FormLabel className="font-black text-xs">جديد؟</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>} />
                                        </div>
                                        <Button type="submit" className="w-full h-14 rounded-2xl font-black shadow-xl">نشر الآن</Button>
                                    </form></Form></ScrollArea>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {!selectedParentId ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mainCategories.map(cat => (
                            <Card key={cat.id} className="rounded-[2.5rem] overflow-hidden shadow-xl border-none transition-all hover:scale-[1.02]">
                                <CardHeader className="bg-primary text-primary-foreground p-8">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="font-black text-2xl">{cat.name}</CardTitle>
                                        <Badge className="bg-white/20 text-white border-none">{cat.displayStyle}</Badge>
                                    </div>
                                    <p className="text-[10px] font-bold opacity-70 mt-2">تاريخ الإنشاء: {cat.createdAt ? new Date(cat.createdAt.seconds * 1000).toLocaleDateString('ar-SA') : '-'}</p>
                                </CardHeader>
                                <CardFooter className="p-4 bg-muted/30 flex gap-2">
                                    <Button className="flex-1 rounded-xl font-black h-12" onClick={() => setSelectedParentId(cat.id)}>إدارة القسم</Button>
                                    {isAdmin && (
                                        <>
                                            <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 border-2" onClick={() => { setEditingCategory(cat); catForm.reset(cat); }}><Edit2 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive h-12 w-12" onClick={() => confirm("هل أنت متأكد من حذف القسم نهائياً؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', cat.id))}><Trash2 className="h-4 w-4" /></Button>
                                        </>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-sm text-primary uppercase tracking-widest">الأقسام الفرعية</h3>
                                <Badge variant="secondary" className="rounded-full px-3">{subCategories.length}</Badge>
                            </div>
                            {subCategories.map(sub => (
                                <div key={sub.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors group">
                                    <span className="font-black text-sm">{sub.name}</span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedParentId(sub.id)}><Layers className="h-4 w-4" /></Button>
                                        {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirm("حذف القسم الفرعي؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', sub.id))}><Trash2 className="h-4 w-4" /></Button>}
                                    </div>
                                </div>
                            ))}
                            {subCategories.length === 0 && <div className="bg-muted/30 rounded-2xl p-8 border border-dashed text-center text-muted-foreground text-xs font-bold">لا توجد أقسام فرعية</div>}
                        </div>
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="font-black text-sm text-primary uppercase tracking-widest">محتوى القسم</h3>
                                <Badge className="rounded-full px-3">{currentItems.length}</Badge>
                            </div>
                            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-sm bg-white">
                                <ScrollArea className="h-[600px]">
                                    <div className="divide-y">
                                        {currentItems.map(item => (
                                            <div key={item.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-muted overflow-hidden border shadow-inner">
                                                        {item.imageUrl ? <img src={item.imageUrl} className="h-full w-full object-cover" alt="" /> : <ImageIcon className="h-full w-full p-4 opacity-20" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm leading-tight">{item.title}</p>
                                                        <div className="flex gap-2 mt-1.5">
                                                            {item.visibility === 'pro' && <Badge className="bg-yellow-500 text-[8px] h-4">PRO</Badge>}
                                                            {item.status === 'pending' && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[8px] h-4">قيد المراجعة</Badge>}
                                                            {item.isNew && <Badge className="bg-green-500 text-[8px] h-4">جديد</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isAdmin && item.status === 'pending' && (
                                                        <Button variant="outline" size="sm" className="bg-green-50 text-green-600 border-green-200 rounded-xl font-black h-9 px-4" onClick={() => updateDocumentNonBlocking(doc(firestore!, 'categories', selectedParentId, 'items', item.id), { status: 'approved' })}>
                                                            <Check className="h-4 w-4 ml-1.5" /> اعتماد
                                                        </Button>
                                                    )}
                                                    {isAdmin && (
                                                        <Button variant="ghost" size="icon" className="text-destructive rounded-xl" onClick={() => confirm("حذف المنشور؟") && deleteDocumentNonBlocking(doc(firestore!, 'categories', selectedParentId, 'items', item.id))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {currentItems.length === 0 && (
                                            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
                                                <ImageIcon className="h-12 w-12 opacity-10" />
                                                <p className="text-xs font-bold">لا يوجد منشورات في هذا القسم بعد</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        )}

        {isAdmin && activeTool === 'plans' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                <FormPlansControl />
            </div>
        )}

        {isAdmin && activeTool === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Tabs defaultValue="ads" dir="rtl" className="space-y-6">
                    <ScrollArea className="w-full">
                        <TabsList className="bg-white rounded-2xl p-1 h-16 border shadow-sm mx-auto grid grid-cols-3 min-w-[400px]">
                            <TabsTrigger value="ads" className="rounded-xl font-black text-xs sm:text-sm">الإعلانات (Adsterra)</TabsTrigger>
                            <TabsTrigger value="theme" className="rounded-xl font-black text-xs sm:text-sm">المظهر والألوان</TabsTrigger>
                            <TabsTrigger value="general" className="rounded-xl font-black text-xs sm:text-sm">روابط ونوافذ</TabsTrigger>
                        </TabsList>
                        <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>
                    
                    <TabsContent value="ads">
                        <Card className="rounded-[2.5rem] p-6 sm:p-10 border-none shadow-xl bg-white max-w-3xl mx-auto">
                            <FormAdsControl />
                        </Card>
                    </TabsContent>

                    <TabsContent value="theme">
                        <Card className="rounded-[2.5rem] p-6 sm:p-10 border-none shadow-xl bg-white max-w-3xl mx-auto">
                            <FormThemeControl />
                        </Card>
                    </TabsContent>

                    <TabsContent value="general">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                            <FormPopupControl />
                            <FormLinksControl />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        )}

        {isAdmin && activeTool === 'notifications' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                <FormNotificationsControl />
            </div>
        )}
      </main>
    </div>
  );
}

function FormPlansControl() {
    const firestore = useFirestore();
    const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null, [firestore]);
    const { data: plans, isLoading } = useCollection<PricingPlan>(plansQuery);
    const { toast } = useToast();
    const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);

    const form = useForm({
        resolver: zodResolver(planSchema),
        defaultValues: { name: '', price: '', currency: 'ر.س', description: '', features: '', isFeatured: false, enabled: true, link: '' }
    });

    const onSave = async (values: any) => {
        if (!firestore) return;
        try {
            const planId = editingPlan?.id || doc(collection(firestore, 'pricingPlans')).id;
            const features = values.features.split(',').map((f: string) => f.trim());
            await setDoc(doc(firestore, 'pricingPlans', planId), {
                ...values,
                features,
                order: editingPlan ? editingPlan.order : (plans?.length || 0)
            }, { merge: true });
            toast({ title: "تم حفظ الخطة" });
            setEditingPlan(null);
            form.reset();
        } catch (e) { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    };

    if (isLoading) return <div className="text-center py-10"><Loader2 className="animate-spin h-10 w-10 mx-auto" /></div>;

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] p-6 sm:p-8 border-none shadow-xl bg-white">
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="font-black text-xl flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" /> {editingPlan ? 'تعديل باقة' : 'إضافة باقة اشتراك جديدة'}
                    </CardTitle>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({field})=><FormItem><FormLabel className="text-xs font-black">اسم الباقة</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="price" render={({field})=><FormItem><FormLabel className="text-xs font-black">السعر</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                                <FormField control={form.control} name="currency" render={({field})=><FormItem><FormLabel className="text-xs font-black">العملة</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                            </div>
                        </div>
                        <FormField control={form.control} name="description" render={({field})=><FormItem><FormLabel className="text-xs font-black">وصف قصير</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>} />
                        <FormField control={form.control} name="features" render={({field})=><FormItem><FormLabel className="text-xs font-black">المميزات (مفصولة بفاصلة ,)</FormLabel><FormControl><Textarea {...field}/></FormControl></FormItem>} />
                        <FormField control={form.control} name="link" render={({field})=><FormItem><FormLabel className="text-xs font-black">رابط دفع خارجي (اختياري)</FormLabel><FormControl><Input {...field} dir="ltr"/></FormControl></FormItem>} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="isFeatured" render={({field})=><FormItem className="flex items-center justify-between p-3 border rounded-xl"><FormLabel className="font-black text-xs">تمييز الباقة؟</FormLabel><Switch checked={field.value} onCheckedChange={field.onChange}/></FormItem>} />
                            <FormField control={form.control} name="enabled" render={({field})=><FormItem className="flex items-center justify-between p-3 border rounded-xl"><FormLabel className="font-black text-xs">تفعيل؟</FormLabel><Switch checked={field.value} onCheckedChange={field.onChange}/></FormItem>} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button type="submit" className="flex-1 h-12 rounded-xl font-black">حفظ الباقة</Button>
                            {editingPlan && <Button variant="outline" type="button" className="rounded-xl h-12" onClick={()=>{setEditingPlan(null); form.reset();}}>إلغاء</Button>}
                        </div>
                    </form>
                </Form>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans?.map(plan => (
                    <Card key={plan.id} className="p-6 rounded-[2rem] border-2 border-muted hover:border-primary/20 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-lg">{plan.name}</h4>
                                <p className="text-primary font-black text-2xl">{plan.price} <span className="text-xs">{plan.currency}</span></p>
                            </div>
                            <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={()=>{setEditingPlan(plan); form.reset({...plan, features: plan.features.join(', ')});}}><Edit2 className="h-4 w-4"/></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={()=>confirm("حذف الباقة؟") && deleteDocumentNonBlocking(doc(firestore!, 'pricingPlans', plan.id))}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        </div>
                        <ul className="space-y-1 mb-4">
                            {plan.features.slice(0, 3).map((f, i)=><li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3 text-green-500"/> {f}</li>)}
                        </ul>
                        <Badge variant={plan.enabled ? 'default' : 'secondary'}>{plan.enabled ? 'نشطة' : 'معطلة'}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function FormAdsControl() {
    const firestore = useFirestore();
    const adsRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'ads') : null, [firestore]);
    const { data: ads, isLoading } = useDoc<AdsConfig>(adsRef);
    const [config, setConfig] = useState<AdsConfig>({ 
        enabled: false, 
        adsterraEnabled: false, 
        interstitialFrequency: 6, 
        manualAdsEnabled: false,
        socialBarScript: '',
        popunderScript: '',
        nativeBannerScript: '',
        directLinkUrl: ''
    });
    const { toast } = useToast();

    useEffect(() => { if (ads) setConfig(prev => ({ ...prev, ...ads })); }, [ads]);

    const handleSave = async () => {
        if (!adsRef) return;
        try { await setDoc(adsRef, config, { merge: true }); toast({ title: "تم تحديث الإعلانات" }); } catch (e) { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border">
                    <p className="text-xs font-black">تفعيل الإعلانات</p>
                    <Switch checked={config.enabled} onCheckedChange={v => setConfig({...config, enabled: v})} />
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border">
                    <p className="text-xs font-black">نظام Adsterra</p>
                    <Switch checked={config.adsterraEnabled} onCheckedChange={v => setConfig({...config, adsterraEnabled: v})} />
                </div>
            </div>
            <div className="space-y-4">
                {[{id:'socialBarScript', label:'Social Bar', icon:Code2}, {id:'popunderScript', label:'Popunder', icon:Code2}, {id:'nativeBannerScript', label:'Native Banner', icon:Layout}].map(item => (
                    <div key={item.id} className="space-y-2">
                        <div className="flex items-center gap-2"><item.icon className="h-4 w-4 text-primary" /><label className="text-[10px] font-black">{item.label}</label></div>
                        <Textarea value={(config as any)[item.id]} onChange={e => setConfig({...config, [item.id]: e.target.value})} dir="ltr" className="h-24 font-mono text-[9px] bg-muted/30" />
                    </div>
                ))}
                <div className="space-y-2">
                    <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><label className="text-[10px] font-black">رابط Direct Link</label></div>
                    <Input value={config.directLinkUrl || ''} onChange={e => setConfig({...config, directLinkUrl: e.target.value})} dir="ltr" className="h-12" />
                </div>
            </div>
            <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black shadow-xl"><Save className="ml-2 h-5 w-5" /> حفظ إعدادات الإعلانات</Button>
        </div>
    );
}

function FormThemeControl() {
    const firestore = useFirestore();
    const themeRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'theme') : null, [firestore]);
    const { data: theme, isLoading } = useDoc<ThemeConfig>(themeRef);
    const [config, setConfig] = useState<ThemeConfig>({ primaryColor: '350 72% 51%', primaryColorDark: '350 72% 51%' });
    const { toast } = useToast();

    useEffect(() => { if (theme) setConfig(theme); }, [theme]);

    const handleSave = async () => {
        if (!themeRef) return;
        try { await setDoc(themeRef, config, { merge: true }); toast({ title: "تم تحديث المظهر" }); } catch (e) { toast({ title: "فشل الحفظ" }); }
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                <div className="space-y-2"><label className="text-xs font-black">اللون الأساسي (الفاتح) - بصيغة HSL</label><Input value={config.primaryColor} onChange={e => setConfig({...config, primaryColor: e.target.value})} dir="ltr" placeholder="350 72% 51%" /></div>
                <div className="space-y-2"><label className="text-xs font-black">اللون الأساسي (الداكن) - بصيغة HSL</label><Input value={config.primaryColorDark || ''} onChange={e => setConfig({...config, primaryColorDark: e.target.value})} dir="ltr" placeholder="350 72% 51%" /></div>
            </div>
            <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black shadow-xl"><Palette className="ml-2 h-5 w-5" /> تطبيق الألوان</Button>
        </div>
    );
}

function FormPopupControl() {
    const firestore = useFirestore();
    const popupRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'subscriptionDialog') : null, [firestore]);
    const { data: popup, isLoading } = useDoc<SubscriptionDialogConfig>(popupRef);
    const [config, setConfig] = useState<SubscriptionDialogConfig>({ enabled: false, title: '', description: '', link: '' });
    const { toast } = useToast();

    useEffect(() => { if (popup) setConfig(popup); }, [popup]);

    const handleSave = async () => {
        if (!popupRef) return;
        try { await setDoc(popupRef, config, { merge: true }); toast({ title: "تم تحديث النافذة" }); } catch (e) { toast({ title: "فشل الحفظ" }); }
    };

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <Card className="rounded-[2.5rem] p-6 sm:p-8 border-none shadow-xl bg-white h-fit">
            <div className="space-y-6">
                <div className="flex items-center justify-between"><h3 className="font-black text-lg">نافذة الاشتراك</h3><Switch checked={config.enabled} onCheckedChange={v => setConfig({...config, enabled: v})} /></div>
                <div className="space-y-2"><label className="text-xs font-black">العنوان</label><Input value={config.title} onChange={e => setConfig({...config, title: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs font-black">الوصف</label><Textarea value={config.description} onChange={e => setConfig({...config, description: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs font-black">رابط الزر</label><Input value={config.link} onChange={e => setConfig({...config, link: e.target.value})} dir="ltr" /></div>
                <Button onClick={handleSave} className="w-full h-12 rounded-xl font-black shadow-lg">حفظ النافذة</Button>
            </div>
        </Card>
    );
}

function FormLinksControl() {
    const firestore = useFirestore();
    const shareRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'shareLink') : null, [firestore]);
    const requestRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'requestDesign') : null, [firestore]);
    const { data: share } = useDoc<ShareLinkConfig>(shareRef);
    const { data: request } = useDoc<RequestDesignConfig>(requestRef);
    const [shareCfg, setShareCfg] = useState<ShareLinkConfig>({ enabled: false, url: '', text: '' });
    const [requestCfg, setRequestCfg] = useState<RequestDesignConfig>({ enabled: false, url: '' });
    const { toast } = useToast();

    useEffect(() => { if (share) setShareCfg(share); if (request) setRequestCfg(request); }, [share, request]);

    const handleSave = async () => {
        try {
            if (shareRef) await setDoc(shareRef, shareCfg, { merge: true });
            if (requestRef) await setDoc(requestRef, requestCfg, { merge: true });
            toast({ title: "تم تحديث الروابط" });
        } catch (e) { toast({ title: "فشل الحفظ" }); }
    };

    return (
        <Card className="rounded-[2.5rem] p-6 sm:p-8 border-none shadow-xl bg-white space-y-8">
            <div className="space-y-6">
                <div className="flex items-center justify-between"><h3 className="font-black text-lg">روابط المشاركة وطلب التصميم</h3></div>
                <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border">
                    <div className="flex items-center justify-between"><label className="text-xs font-black flex items-center gap-2"><Share2 className="h-4 w-4" /> زر المشاركة</label><Switch checked={shareCfg.enabled} onCheckedChange={v => setShareCfg({...shareCfg, enabled: v})} /></div>
                    <Input placeholder="رابط المشاركة" value={shareCfg.url} onChange={e => setShareCfg({...shareCfg, url: e.target.value})} dir="ltr" />
                </div>
                <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border">
                    <div className="flex items-center justify-between"><label className="text-xs font-black flex items-center gap-2"><Brush className="h-4 w-4" /> طلب تصميم</label><Switch checked={requestCfg.enabled} onCheckedChange={v => setRequestCfg({...requestCfg, enabled: v})} /></div>
                    <Input placeholder="رابط واتساب أو نموذج" value={requestCfg.url} onChange={e => setRequestCfg({...requestCfg, url: e.target.value})} dir="ltr" />
                </div>
                <Button onClick={handleSave} className="w-full h-12 rounded-xl font-black shadow-lg">حفظ كافة الروابط</Button>
            </div>
        </Card>
    );
}

function FormNotificationsControl() {
    const firestore = useFirestore();
    const notificationsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null, [firestore]);
    const { data: notifications } = useCollection<Notification>(notificationsQuery);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const { toast } = useToast();

    const send = async () => {
        if (!firestore || !title || !desc) return;
        try {
            await addDocumentNonBlocking(collection(firestore, 'notifications'), { title, description: desc, createdAt: serverTimestamp() });
            setTitle(''); setDesc(''); toast({ title: "تم إرسال الإشعار بنجاح" });
        } catch (e) { toast({ title: "فشل الإرسال" }); }
    };

    return (
        <div className="space-y-8">
            <Card className="rounded-[2.5rem] p-6 sm:p-8 border-none shadow-xl bg-white">
                <CardHeader className="p-0 mb-6"><CardTitle className="font-black">إرسال إشعار جديد للجميع</CardTitle></CardHeader>
                <div className="space-y-4">
                    <div className="space-y-2"><label className="text-xs font-black">عنوان الإشعار</label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-xs font-black">نص الإشعار</label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
                    <Button onClick={send} className="w-full h-14 rounded-2xl font-black shadow-xl"><Send className="ml-2 h-5 w-5" /> إرسال الآن</Button>
                </div>
            </Card>
            <div className="space-y-4">
                <h3 className="font-black text-sm text-primary uppercase tracking-widest px-2">الإشعارات السابقة</h3>
                {notifications?.map(n => (
                    <div key={n.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-xs truncate">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{n.description}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'notifications', n.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
            </div>
        </div>
    );
}