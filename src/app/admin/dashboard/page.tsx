'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useAuth } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, orderBy } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem, SubscriptionDialogConfig, ShareLinkConfig, ThemeConfig, Notification as NotificationType, WhitelistEntry } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, PlusCircle, Loader2, ArrowUp, ArrowDown, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/video-utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const colorRegex = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%\s*$/;

// Helper to gracefully handle old localized data
const getArabicString = (field: string | { ar: string, en: string } | undefined | null): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.ar || '';
};

const useFormSchemas = () => {
    const categorySchema = z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        parentId: z.string().optional(),
        displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5'], { required_error: "نمط العرض مطلوب" }),
        fileTypes: z.string().optional(),
    });

    const contentItemSchema = z.object({
        title: z.string().min(1, "العنوان مطلوب"),
        imageUrl: z.string().url("رابط غير صالح").optional().or(z.literal('')),
        downloadUrl: z.string().url("رابط غير صالح").optional().or(z.literal('')),
        prompt: z.string().optional(),
        instructions: z.string().optional(),
        videoUrl: z.string().url("رابط غير صالح").optional().or(z.literal('')),
        screenshots: z.string().optional(),
        appVersion: z.string().optional(),
    });

    const subscriptionDialogSchema = z.object({
        title: z.string().min(1, "العنوان مطلوب"),
        description: z.string().min(1, "الوصف مطلوب"),
        link: z.string().url("رابط غير صالح"),
        enabled: z.boolean().default(false),
    });

    const shareLinkSchema = z.object({
        url: z.string().url("رابط غير صالح"),
        text: z.string().optional(),
        enabled: z.boolean().default(false),
    });
    
    const themeSchema = z.object({
        primaryColor: z.string().min(1, "كود اللون مطلوب").regex(colorRegex, "صيغة اللون غير صحيحة. مثال: 350 72% 51%"),
        primaryColorDark: z.string().optional().regex(colorRegex, {message: "صيغة اللون غير صحيحة. مثال: 350 72% 51%"}).or(z.literal('')),
    });

    const notificationSchema = z.object({
        title: z.string().min(1, "العنوان مطلوب"),
        description: z.string().min(1, "الوصف مطلوب"),
    });

    const whitelistSchema = z.object({
        email: z.string().email("البريد الإلكتروني غير صالح."),
        role: z.enum(['admin', 'pro'], { required_error: "الدور مطلوب." }),
    });

    return { categorySchema, contentItemSchema, subscriptionDialogSchema, shareLinkSchema, themeSchema, notificationSchema, whitelistSchema };
}

type CategoryFormValues = z.infer<Return<(typeof useFormSchemas)>['categorySchema']>;
type ContentItemFormValues = z.infer<Return<(typeof useFormSchemas)>['contentItemSchema']>;
type SubscriptionDialogFormValues = z.infer<Return<(typeof useFormSchemas)>['subscriptionDialogSchema']>;
type ShareLinkFormValues = z.infer<Return<(typeof useFormSchemas)>['shareLinkSchema']>;
type ThemeFormValues = z.infer<Return<(typeof useFormSchemas)>['themeSchema']>;
type NotificationFormValues = z.infer<Return<(typeof useFormSchemas)>['notificationSchema']>;
type WhitelistFormValues = z.infer<Return<(typeof useFormSchemas)>['whitelistSchema']>;


export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [deletingEntity, setDeletingEntity] = useState<{ type: 'category' | 'item' | 'notification' | 'whitelist', entity: WithId<CategoryType> | WithId<ContentItem> | WithId<NotificationType> | WithId<WhitelistEntry> } | null>(null);

  // Categories state
  const [editingCategory, setEditingCategory] = useState<WithId<CategoryType> | null>(null);

  // Content Items state
  const [selectedContentCategory, setSelectedContentCategory] = useState<string>('');
  const [editingItem, setEditingItem] = useState<WithId<ContentItem> | null>(null);
  const [sortedItems, setSortedItems] = useState<WithId<ContentItem>[]>([]);


  // Data fetching
  const categoriesCollectionQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: allCategories, isLoading: isLoadingCategories } = useCollection<CategoryType>(categoriesCollectionQuery, { propagateError: false });
  
  const itemsCollectionQuery = useMemoFirebase(() => (firestore && selectedContentCategory) ? query(collection(firestore, 'categories', selectedContentCategory, 'items'), orderBy('order', 'asc')) : null, [firestore, selectedContentCategory]);
  const { data: items, isLoading: isLoadingItems } = useCollection<ContentItem>(itemsCollectionQuery, { propagateError: false });

  const subscriptionDialogRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'subscriptionDialog') : null, [firestore]);
  const { data: subscriptionDialogData } = useDoc<SubscriptionDialogConfig>(subscriptionDialogRef);

  const shareLinkRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'shareLink') : null, [firestore]);
  const { data: shareLinkData } = useDoc<ShareLinkConfig>(shareLinkRef);
  
  const themeRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'theme') : null, [firestore]);
  const { data: themeData } = useDoc<ThemeConfig>(themeRef);
  
  const notificationsCollectionQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: notifications, isLoading: isLoadingNotifications } = useCollection<NotificationType>(notificationsCollectionQuery);

  const whitelistCollectionQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'whitelist'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: whitelistedUsers, isLoading: isLoadingWhitelist } = useCollection<WhitelistEntry>(whitelistCollectionQuery);


  useEffect(() => {
    if (items) {
        setSortedItems(items);
    } else {
        setSortedItems([]);
    }
  }, [items]);


  const { mainCategories, subCategories, categoryMap } = useMemo(() => {
    if (!allCategories) return { mainCategories: [], subCategories: new Map(), categoryMap: new Map() };
    
    const main: WithId<CategoryType>[] = [];
    const sub = new Map<string, WithId<CategoryType>[]>();
    const catMap = new Map<string, WithId<CategoryType>>();

    allCategories.forEach(cat => {
        catMap.set(cat.id, cat);
        if (cat.parentId) {
            if (!sub.has(cat.parentId)) sub.set(cat.parentId, []);
            sub.get(cat.parentId)!.push(cat);
        } else {
            main.push(cat);
        }
    });

    return { mainCategories: main, subCategories: sub, categoryMap: catMap };
  }, [allCategories]);
  

  // Forms
  const { categorySchema, contentItemSchema, subscriptionDialogSchema, shareLinkSchema, themeSchema, notificationSchema, whitelistSchema } = useFormSchemas();
  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: { name: '', parentId: '', displayStyle: 'style1', fileTypes: '' } });
  const contentItemForm = useForm<ContentItemFormValues>({ resolver: zodResolver(contentItemSchema), defaultValues: { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', screenshots: '', appVersion: '' } });
  const subscriptionDialogForm = useForm<SubscriptionDialogFormValues>({ resolver: zodResolver(subscriptionDialogSchema), defaultValues: { title: '', description: '', link: '', enabled: false } });
  const shareLinkForm = useForm<ShareLinkFormValues>({ resolver: zodResolver(shareLinkSchema), defaultValues: { url: '', text: '', enabled: false } });
  const themeForm = useForm<ThemeFormValues>({ resolver: zodResolver(themeSchema), defaultValues: { primaryColor: '', primaryColorDark: '' } });
  const notificationForm = useForm<NotificationFormValues>({ resolver: zodResolver(notificationSchema), defaultValues: { title: '', description: '' } });
  const whitelistForm = useForm<WhitelistFormValues>({ resolver: zodResolver(whitelistSchema), defaultValues: { email: '', role: 'pro' } });


  // Effects to reset forms when editing state changes
  useEffect(() => {
    const defaultValues = { name: '', displayStyle: 'style1' as const, fileTypes: '', parentId: ''};
    if (editingCategory) {
      categoryForm.reset({ 
        name: getArabicString(editingCategory.name),
        displayStyle: editingCategory.displayStyle, 
        fileTypes: editingCategory.fileTypes || '',
        parentId: editingCategory.parentId || ''
      });
    }
    else {
        categoryForm.reset(defaultValues);
    }
  }, [editingCategory, categoryForm]);


  useEffect(() => {
    const defaultValues: ContentItemFormValues = { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', screenshots: '', appVersion: '' };
    if (editingItem) {
        contentItemForm.reset({ 
            title: getArabicString(editingItem.title),
            instructions: getArabicString(editingItem.instructions),
            imageUrl: editingItem.imageUrl || '', 
            downloadUrl: editingItem.downloadUrl || '', 
            prompt: editingItem.prompt || '', 
            videoUrl: editingItem.videoUrl || '',
            screenshots: (editingItem.screenshots || []).join(', '),
            appVersion: editingItem.appVersion || '',
        });
    }
    else contentItemForm.reset(defaultValues);
  }, [editingItem, contentItemForm]);
  
  useEffect(() => {
    if (subscriptionDialogData) {
        subscriptionDialogForm.reset(subscriptionDialogData);
    }
  }, [subscriptionDialogData, subscriptionDialogForm]);
  
  useEffect(() => {
    if (shareLinkData) {
        shareLinkForm.reset(shareLinkData);
    }
  }, [shareLinkData, shareLinkForm]);

  useEffect(() => {
    if (themeData) {
        themeForm.reset({
            primaryColor: themeData.primaryColor,
            primaryColorDark: themeData.primaryColorDark || ''
        });
    } else {
        themeForm.reset({ primaryColor: "350 72% 51%", primaryColorDark: "350 72% 51%" });
    }
  }, [themeData, themeForm]);

  // Handlers
  const onCategorySubmit = (values: CategoryFormValues) => {
    if (!firestore) return;
    
    const parentId = (values.parentId === 'root' || !values.parentId) ? null : values.parentId;

    if (editingCategory) {
      const dataToSave = {
        name: values.name,
        displayStyle: values.displayStyle,
        fileTypes: values.fileTypes,
        parentId: parentId,
      };
      updateDocumentNonBlocking(doc(firestore, 'categories', editingCategory.id), dataToSave);
      toast({ title: "تم تحديث القسم" });
      setEditingCategory(null);
    } else {
      const list = parentId ? (subCategories.get(parentId) || []) : mainCategories;
      const newOrder = list.length > 0 ? Math.max(...list.map(c => c.order ?? 0)) + 1 : 0;
      const data = { 
        name: values.name,
        displayStyle: values.displayStyle,
        fileTypes: values.fileTypes,
        parentId, 
        order: newOrder, 
        createdAt: serverTimestamp() 
      };
      addDocumentNonBlocking(collection(firestore, 'categories'), data);
      toast({ title: parentId ? "تم إضافة قسم فرعي" : "تم إضافة قسم رئيسي" });
    }
    categoryForm.reset({ name: '', displayStyle: 'style1', fileTypes: '', parentId: ''});
  };

  const onContentItemSubmit = (values: ContentItemFormValues) => {
    if (!firestore || !selectedContentCategory) return;
    const category = categoryMap.get(selectedContentCategory);
    if (!category) return;
    
    let itemData: Partial<Omit<ContentItem, 'id' | 'createdAt'>> = { title: values.title };

    if (['style1', 'style2'].includes(category.displayStyle)) {
        if (!values.imageUrl) { contentItemForm.setError('imageUrl', { message: "رابط الصورة مطلوب" }); return; }
        if (!values.downloadUrl) { contentItemForm.setError('downloadUrl', { message: "رابط التحميل مطلوب" }); return; }
        itemData = { ...itemData, imageUrl: values.imageUrl, downloadUrl: values.downloadUrl };
    } else if (category.displayStyle === 'style3') {
        if (!values.imageUrl) { contentItemForm.setError('imageUrl', { message: "رابط الصورة مطلوب" }); return; }
        if (!values.prompt) { contentItemForm.setError('prompt', { message: "البرومبت مطلوب" }); return; }
        itemData = { 
            ...itemData, 
            imageUrl: values.imageUrl, 
            prompt: values.prompt, 
            instructions: values.instructions, 
            downloadUrl: values.downloadUrl 
        };
    } else if (category.displayStyle === 'style4') {
        if (!values.videoUrl) { contentItemForm.setError('videoUrl', { message: "رابط الفيديو مطلوب" }); return; }
        const videoId = getYouTubeVideoId(values.videoUrl);
        if (!videoId) { contentItemForm.setError('videoUrl', { message: "رابط يوتيوب غير صالح" }); return; }
        itemData = { ...itemData, videoUrl: values.videoUrl, imageUrl: getYouTubeThumbnailUrl(videoId) };
    } else if (category.displayStyle === 'style5') {
        if (!values.imageUrl) { contentItemForm.setError('imageUrl', { message: "رابط الأيقونة مطلوب" }); return; }
        if (!values.downloadUrl) { contentItemForm.setError('downloadUrl', { message: "رابط التحميل مطلوب" }); return; }
        
        const screenshots = (values.screenshots || '').split(',').map(s => s.trim()).filter(s => s);
        itemData = { 
            ...itemData, 
            imageUrl: values.imageUrl, 
            instructions: values.instructions, 
            downloadUrl: values.downloadUrl, 
            screenshots,
            appVersion: values.appVersion || '',
        };
    }

    if (editingItem) {
      updateDocumentNonBlocking(doc(firestore, 'categories', selectedContentCategory, 'items', editingItem.id), itemData);
      toast({ title: "تم تحديث المحتوى" });
      setEditingItem(null);
    } else {
      const newOrder = sortedItems.length > 0 ? Math.max(...sortedItems.map(i => i.order ?? 0)) + 1 : 0;
      addDocumentNonBlocking(collection(firestore, 'categories', selectedContentCategory, 'items'), { ...itemData, order: newOrder, createdAt: serverTimestamp() });
      toast({ title: "تم إضافة محتوى جديد" });
    }
    contentItemForm.reset({ title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', screenshots: '', appVersion: '' });
  };
  
  const onSubscriptionDialogSubmit = (values: SubscriptionDialogFormValues) => {
    if (!firestore || !subscriptionDialogRef) return;
    setDocumentNonBlocking(subscriptionDialogRef, values, { merge: true });
    toast({ title: "تم حفظ إعدادات النافذة المنبثقة" });
  };
  
  const onShareLinkSubmit = (values: ShareLinkFormValues) => {
    if (!firestore || !shareLinkRef) return;
    setDocumentNonBlocking(shareLinkRef, values, { merge: true });
    toast({ title: "تم حفظ إعدادات رابط المشاركة" });
  };
  
  const onThemeSubmit = (values: ThemeFormValues) => {
    if (!firestore || !themeRef) return;
    const dataToSave = {
        ...values,
        primaryColorDark: values.primaryColorDark || values.primaryColor,
    };
    setDocumentNonBlocking(themeRef, dataToSave, { merge: true });
    toast({ title: "تم حفظ لون الموقع" });
  };

  const onNotificationSubmit = (values: NotificationFormValues) => {
    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, 'notifications'), { ...values, createdAt: serverTimestamp() });
    toast({ title: "تم إرسال الإشعار بنجاح" });
    notificationForm.reset();
  };

  const onWhitelistSubmit = (values: WhitelistFormValues) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'whitelist', values.email);
    setDocumentNonBlocking(docRef, {
      ...values,
      createdAt: serverTimestamp()
    }, { merge: true });
    toast({ title: "تم تفعيل المستخدم" });
    whitelistForm.reset();
  };


  const handleDelete = () => {
    if (!firestore || !deletingEntity) return;
    const { type, entity } = deletingEntity;
    
    if(type === 'category') {
      deleteDocumentNonBlocking(doc(firestore, 'categories', entity.id));
      toast({ title: "تم حذف القسم" });
    } else if (type === 'item' && selectedContentCategory){
       deleteDocumentNonBlocking(doc(firestore, 'categories', selectedContentCategory, 'items', entity.id));
       toast({ title: "تم حذف المحتوى" });
    } else if (type === 'notification') {
       deleteDocumentNonBlocking(doc(firestore, 'notifications', entity.id));
       toast({ title: "تم حذف الإشعار" });
    } else if (type === 'whitelist') {
       deleteDocumentNonBlocking(doc(firestore, 'whitelist', entity.id));
       toast({ title: "تم إزالة المستخدم من القائمة البيضاء" });
    }
    
    setDeletingEntity(null);
  };
  
  const handleMove = (categoryToMove: WithId<CategoryType>, direction: 'up' | 'down') => {
    if (!firestore) return;
    const list = categoryToMove.parentId ? (subCategories.get(categoryToMove.parentId) || []) : mainCategories;
    if (!list) return;

    const currentIndex = list.findIndex(c => c.id === categoryToMove.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    const batch = writeBatch(firestore);
    const currentItem = list[currentIndex];
    const targetItem = list[targetIndex];

    if (currentItem && targetItem) {
        batch.update(doc(firestore, 'categories', currentItem.id), { order: targetItem.order });
        batch.update(doc(firestore, 'categories', targetItem.id), { order: currentItem.order });

        batch.commit().catch((e) => {
          toast({ variant: 'destructive', title: "فشل تحديث الترتيب", description: e.message });
        });
    }
  };

  const handleMoveItem = (itemToMove: WithId<ContentItem>, direction: 'up' | 'down') => {
    if (!firestore || !selectedContentCategory) return;
    
    const list = sortedItems;
    const currentIndex = list.findIndex(i => i.id === itemToMove.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    
    const batch = writeBatch(firestore);
    const currentItem = list[currentIndex];
    const targetItem = list[targetIndex];

    if (currentItem && targetItem) {
        const currentItemRef = doc(firestore, 'categories', selectedContentCategory, 'items', currentItem.id);
        const targetItemRef = doc(firestore, 'categories', selectedContentCategory, 'items', targetItem.id);

        batch.update(currentItemRef, { order: targetItem.order });
        batch.update(targetItemRef, { order: currentItem.order });

        batch.commit().catch((e) => {
          toast({ variant: 'destructive', title: "فشل تحديث الترتيب", description: e.message });
        });
    }
  };

  const CategoryForm = () => (
    <div className="mb-6">
        <h3 className="text-xl font-bold mb-4">{editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}</h3>
        <Form {...categoryForm}>
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4 p-4 border rounded-lg bg-card">
            <FormField control={categoryForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>اسم القسم</FormLabel><FormControl><Input placeholder="اسم القسم" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <FormField
                control={categoryForm.control}
                name="parentId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>القسم الرئيسي (اختياري)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="جعله كقسم رئيسي" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="root">-- قسم رئيسي --</SelectItem>
                                {mainCategories.filter(cat => cat.id !== editingCategory?.id).map((cat) => ( // Prevent self-parenting
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {getArabicString(cat.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            إذا اخترت قسمًا، سيصبح هذا قسمًا فرعيًا له.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField control={categoryForm.control} name="displayStyle" render={({ field }) => (<FormItem><FormLabel>نمط العرض</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="style1">النمط الافقي</SelectItem><SelectItem value="style2">نمط 2</SelectItem><SelectItem value="style3">نمط 3 (برومبت)</SelectItem><SelectItem value="style4">نمط 4 (فيديو)</SelectItem><SelectItem value="style5">النمط 5 (بطاقة معرض)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={categoryForm.control} name="fileTypes" render={({ field }) => (<FormItem><FormLabel>صيغ الملفات (اختياري)</FormLabel><FormControl><Input placeholder="PSD, AI" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex gap-2">
                {editingCategory && <Button type="button" variant="secondary" onClick={() => { setEditingCategory(null); }} className="w-full">إلغاء</Button>}
                <Button type="submit" disabled={categoryForm.formState.isSubmitting} className="w-full">{editingCategory ? "حفظ" : "إضافة"}</Button>
            </div>
          </form>
        </Form>
      </div>
  );

  const ContentItemForm = () => {
    const category = categoryMap.get(selectedContentCategory);
    if (!category) return null;
    return (
        <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">{editingItem ? "تعديل محتوى" : "إضافة محتوى جديد"} في "{getArabicString(category.name)}"</h3>
            <Form {...contentItemForm}>
                <form onSubmit={contentItemForm.handleSubmit(onContentItemSubmit)} className="space-y-4 p-4 border rounded-lg bg-card">
                    <FormField control={contentItemForm.control} name="title" render={({ field }) => <FormItem><FormLabel>العنوان</FormLabel><FormControl><Input placeholder="العنوان" {...field} /></FormControl><FormMessage /></FormItem>} />
                    
                    {['style1', 'style2', 'style3'].includes(category.displayStyle) && <FormField control={contentItemForm.control} name="imageUrl" render={({ field }) => <FormItem><FormLabel>رابط الصورة</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}
                    {category.displayStyle === 'style5' && <FormField control={contentItemForm.control} name="imageUrl" render={({ field }) => <FormItem><FormLabel>رابط الأيقونة</FormLabel><FormControl><Input placeholder="https://example.com/icon.png" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}

                    {['style1', 'style2', 'style5'].includes(category.displayStyle) && <FormField control={contentItemForm.control} name="downloadUrl" render={({ field }) => <FormItem><FormLabel>رابط التحميل</FormLabel><FormControl><Input placeholder="https://example.com/file.zip" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}
                    
                    {category.displayStyle === 'style3' && (
                        <>
                            <FormField control={contentItemForm.control} name="instructions" render={({ field }) => <FormItem><FormLabel>التعليمات (اختياري)</FormLabel><FormControl><Textarea placeholder="تعليمات استخدام البرومبت..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={contentItemForm.control} name="prompt" render={({ field }) => <FormItem><FormLabel>البرومبت</FormLabel><FormControl><Textarea placeholder="نص البرومبت..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={contentItemForm.control} name="downloadUrl" render={({ field }) => <FormItem><FormLabel>رابط التحميل (اختياري)</FormLabel><FormControl><Input placeholder="https://example.com/file.zip" {...field} value={field.value ?? ''} /></FormControl><FormDescription>إذا تم توفير رابط، سيظهر زر تحميل بجانب زر نسخ البرومبت.</FormDescription><FormMessage /></FormItem>} />
                        </>
                    )}
                    
                    {category.displayStyle === 'style5' && (
                       <>
                        <FormField control={contentItemForm.control} name="appVersion" render={({ field }) => <FormItem><FormLabel>إصدار التطبيق (اختياري)</FormLabel><FormControl><Input placeholder="1.0.0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={contentItemForm.control} name="instructions" render={({ field }) => <FormItem><FormLabel>الوصف (اختياري)</FormLabel><FormControl><Textarea placeholder="وصف العنصر..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                       </>
                    )}

                    {category.displayStyle === 'style4' && <FormField control={contentItemForm.control} name="videoUrl" render={({ field }) => <FormItem><FormLabel>رابط الفيديو (يوتيوب)</FormLabel><FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}

                    {category.displayStyle === 'style5' && <FormField control={contentItemForm.control} name="screenshots" render={({ field }) => (
                        <FormItem>
                            <FormLabel>روابط صور المعرض (اختياري)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="https://.../img1.png, https://.../img2.png" {...field} value={field.value ?? ''} dir="ltr" />
                            </FormControl>
                            <FormDescription>
                                ضع روابط الصور مفصولة بفاصلة (,).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />}

                    <div className="flex gap-2">
                       {editingItem && <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} className="w-full">إلغاء</Button>}
                       <Button type="submit" disabled={contentItemForm.formState.isSubmitting} className="w-full">{contentItemForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingItem ? "حفظ" : "إضافة")}</Button>
                    </div>
                </form>
            </Form>
        </div>
    )
  };


  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <Header title="لوحة التحكم" showMenu={false}>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => auth.signOut()}><LogOut className="ml-2 h-4 w-4" />تسجيل الخروج</Button>
        </Header>
        <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 space-y-12">
            <div>
                <CategoryForm />
        
                <h3 className="text-xl font-bold my-4">الأقسام الحالية</h3>
                {isLoadingCategories ? <Skeleton className="h-40 w-full" /> : (
                    <Accordion type="single" collapsible className="w-full bg-card rounded-lg p-4 border">
                        {mainCategories.map((cat, index) => (
                            <AccordionItem value={cat.id} key={cat.id}>
                                <AccordionTrigger>
                                    <div className="flex-1 text-right">{getArabicString(cat.name)}</div>
                                    <div className="flex items-center gap-2 mr-auto">
                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(cat, 'up') }} disabled={index === 0}>
                                            <span><ArrowUp/></span>
                                        </Button>
                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(cat, 'down') }} disabled={index === mainCategories.length - 1}>
                                            <span><ArrowDown/></span>
                                        </Button>
                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}>
                                            <span><Edit/></span>
                                        </Button>
                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingEntity({ type: 'category', entity: cat }); }}>
                                            <span><Trash2/></span>
                                        </Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-secondary rounded-md">
                                    <div className="space-y-2">
                                        {(subCategories.get(cat.id) || []).length === 0 && <p className="text-muted-foreground text-center">لا توجد أقسام فرعية.</p>}
                                        {(subCategories.get(cat.id) || []).map((subCat, subIndex) => (
                                             <div key={subCat.id} className="flex items-center bg-card p-2 rounded-md border">
                                                 <p className="flex-1">{getArabicString(subCat.name)}</p>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(subCat, 'up')} disabled={subIndex === 0}><ArrowUp/></Button>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(subCat, 'down')} disabled={subIndex === (subCategories.get(cat.id)?.length ?? 1) - 1}><ArrowDown/></Button>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setEditingCategory(subCat); }}><Edit/></Button>
                                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'category', entity: subCat })}><Trash2/></Button>
                                             </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
            
            <div>
                <Card className="mb-6">
                  <CardContent className="p-4 space-y-2">
                    <Label>اختر قسمًا لعرض محتواه وتعديله</Label>
                     <Select onValueChange={setSelectedContentCategory} value={selectedContentCategory}>
                      <SelectTrigger><SelectValue placeholder="اختر قسم..." /></SelectTrigger>
                      <SelectContent>
                          {mainCategories.map(cat => (
                              <SelectGroup key={cat.id}>
                                  <SelectLabel>{getArabicString(cat.name)}</SelectLabel>
                                  <SelectItem value={cat.id}>{getArabicString(cat.name)} (قسم رئيسي)</SelectItem>
                                  {(subCategories.get(cat.id) || []).map(subCat => (
                                      <SelectItem key={subCat.id} value={subCat.id} className="pr-8">{getArabicString(subCat.name)}</SelectItem>
                                  ))}
                              </SelectGroup>
                          ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
                
                {selectedContentCategory && <ContentItemForm />}

                {selectedContentCategory && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>المحتوى الحالي في "{getArabicString(categoryMap.get(selectedContentCategory)?.name) || ''}"</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {isLoadingItems ? <Skeleton className="h-10 w-full" /> : sortedItems.map((item, index) => (
                                    <div key={item.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <p className="flex-1">{getArabicString(item.title)}</p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveItem(item, 'up')} disabled={index === 0}><ArrowUp/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveItem(item, 'down')} disabled={index === sortedItems.length - 1}><ArrowDown/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(item)}><Edit/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'item', entity: item })}><Trash2/></Button>
                                    </div>
                                ))}
                                {!isLoadingItems && sortedItems.length === 0 && (
                                    <p className="text-muted-foreground text-center p-4">لا يوجد محتوى في هذا القسم بعد.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">إعدادات التطبيق</h2>
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>تغيير لون الموقع</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...themeForm}>
                                <form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                                    <FormField
                                        control={themeForm.control}
                                        name="primaryColor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>اللون الأساسي (الوضع الفاتح)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="350 72% 51%" {...field} dir="ltr" />
                                                </FormControl>
                                                <FormDescription>
                                                    أدخل قيمة اللون بصيغة HSL بدون أقواس. مثال: 350 72% 51%
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={themeForm.control}
                                        name="primaryColorDark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>اللون الأساسي (الوضع الليلي)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="350 72% 51%" {...field} dir="ltr" value={field.value ?? ''}/>
                                                </FormControl>
                                                 <FormDescription>
                                                    أدخل قيمة اللون بصيغة HSL بدون أقواس. مثال: 350 72% 51%
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={themeForm.formState.isSubmitting} className="w-full">
                                      {themeForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ اللون"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>إعدادات النافذة المنبثقة للاشتراك</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...subscriptionDialogForm}>
                                <form onSubmit={subscriptionDialogForm.handleSubmit(onSubscriptionDialogSubmit)} className="space-y-6">
                                    <FormField control={subscriptionDialogForm.control} name="enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">تفعيل النافذة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                                    <FormField control={subscriptionDialogForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>عنوان النافذة</FormLabel><FormControl><Input placeholder="رفيق المصمم" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={subscriptionDialogForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>نص النافذة</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={subscriptionDialogForm.control} name="link" render={({ field }) => ( <FormItem><FormLabel>رابط الاشتراك</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" disabled={subscriptionDialogForm.formState.isSubmitting} className="w-full">
                                      {subscriptionDialogForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ الإعدادات"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>إعدادات رابط مشاركة التطبيق</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...shareLinkForm}>
                                <form onSubmit={shareLinkForm.handleSubmit(onShareLinkSubmit)} className="space-y-6">
                                     <FormField control={shareLinkForm.control} name="enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">تفعيل زر المشاركة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                                     <FormField control={shareLinkForm.control} name="url" render={({ field }) => ( <FormItem><FormLabel>رابط المشاركة</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                     <FormField control={shareLinkForm.control} name="text" render={({ field }) => ( <FormItem><FormLabel>نص المشاركة (اختياري)</FormLabel><FormControl><Textarea placeholder="..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" disabled={shareLinkForm.formState.isSubmitting} className="w-full">
                                      {shareLinkForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ الإعدادات"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>إرسال إشعار جديد</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...notificationForm}>
                                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                                    <FormField control={notificationForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>عنوان الإشعار</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={notificationForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>نص الإشعار</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" disabled={notificationForm.formState.isSubmitting} className="w-full">
                                      {notificationForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "إرسال الإشعار"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>الإشعارات السابقة</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {isLoadingNotifications ? <Skeleton className="h-10 w-full" /> : (notifications && notifications.length > 0) ? notifications.map((notif) => (
                                    <div key={notif.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <div className="flex-1">
                                            <p className="font-bold">{getArabicString(notif.title)}</p>
                                            <p className="text-sm text-muted-foreground">{getArabicString(notif.description)}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'notification', entity: notif })}><Trash2/></Button>
                                    </div>
                                )) : <p className="text-muted-foreground text-center p-4">لا توجد إشعارات سابقة.</p>}
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>تفعيل المستخدمين</CardTitle>
                            <CardDescription>أضف مستخدمين إلى القائمة البيضاء لمنحهم صلاحيات "Admin" أو "Pro".</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...whitelistForm}>
                                <form onSubmit={whitelistForm.handleSubmit(onWhitelistSubmit)} className="space-y-6">
                                    <FormField control={whitelistForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>البريد الإلكتروني للمشترك</FormLabel><FormControl><Input placeholder="user@example.com" {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={whitelistForm.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الصلاحية</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="pro">Pro</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="submit" disabled={whitelistForm.formState.isSubmitting} className="w-full">
                                    {whitelistForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "تفعيل"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>المستخدمون المفعلون</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {isLoadingWhitelist ? <Skeleton className="h-10 w-full" /> : (whitelistedUsers && whitelistedUsers.length > 0) ? whitelistedUsers.map((user) => (
                                    <div key={user.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <div className="flex-1">
                                            <p className="font-bold">{user.email}</p>
                                            <p className="text-sm text-muted-foreground">
                                                الصلاحية: <span className="font-semibold text-primary">{user.role === 'admin' ? 'Admin' : 'Pro'}</span>
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'whitelist', entity: user })}><Trash2/></Button>
                                    </div>
                                )) : <p className="text-muted-foreground text-center p-4">لا يوجد مستخدمون في القائمة البيضاء.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
        <AlertDialog open={!!deletingEntity} onOpenChange={(open) => !open && setDeletingEntity(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                    سيتم حذف "
                    {deletingEntity?.type === 'whitelist' 
                        ? (deletingEntity.entity as WhitelistEntry).email 
                        : (getArabicString(deletingEntity?.entity.name) || getArabicString(deletingEntity?.entity.title) || '')
                    }
                    ". هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
