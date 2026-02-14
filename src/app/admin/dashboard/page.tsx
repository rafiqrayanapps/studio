'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useAuth, WithId, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, orderBy } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem, SubscriptionDialogConfig, ShareLinkConfig, ThemeConfig, Notification as NotificationType, LocalizedString } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, PlusCircle, Loader2, ArrowUp, ArrowDown, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useLocale } from '@/hooks/use-locale';
import { getLocalizedString } from '@/lib/locale-utils';

const colorRegex = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%\s*$/;

const useFormSchemas = () => {
    const { t } = useLocale();

    const localizedStringSchema = z.object({
        ar: z.string().min(1, t('textRequired')),
        en: z.string().min(1, t('textRequired')),
    });

    const optionalLocalizedStringSchema = z.object({
        ar: z.string().optional(),
        en: z.string().optional(),
    }).optional();

    const categorySchema = z.object({
        name: localizedStringSchema,
        parentId: z.string().optional(),
        displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5'], { required_error: t('displayStyleRequired') }),
        fileTypes: z.string().optional(),
    });

    const contentItemSchema = z.object({
        title: localizedStringSchema,
        imageUrl: z.string().url(t('invalidUrl')).optional().or(z.literal('')),
        downloadUrl: z.string().url(t('invalidUrl')).optional().or(z.literal('')),
        prompt: z.string().optional(),
        instructions: optionalLocalizedStringSchema,
        videoUrl: z.string().url(t('invalidUrl')).optional().or(z.literal('')),
        screenshots: z.string().optional(),
        appVersion: z.string().optional(),
    });

    const subscriptionDialogSchema = z.object({
        title: z.string().min(1, t('titleRequired')),
        description: z.string().min(1, t('descriptionRequired')),
        link: z.string().url(t('invalidUrl')),
        enabled: z.boolean().default(false),
    });

    const shareLinkSchema = z.object({
        url: z.string().url(t('invalidUrl')),
        text: z.string().optional(),
        enabled: z.boolean().default(false),
    });
    
    const themeSchema = z.object({
        primaryColor: z.string().min(1, t('colorCodeRequired')).regex(colorRegex, t('invalidHslFormat')),
        primaryColorDark: z.string().optional().regex(colorRegex, {message: t('invalidHslFormat')}).or(z.literal('')),
    });

    const notificationSchema = z.object({
        title: localizedStringSchema,
        description: localizedStringSchema,
    });

    return { categorySchema, contentItemSchema, subscriptionDialogSchema, shareLinkSchema, themeSchema, notificationSchema };
}

type CategoryFormValues = z.infer<Return<(typeof useFormSchemas)>['categorySchema']>;
type ContentItemFormValues = z.infer<Return<(typeof useFormSchemas)>['contentItemSchema']>;
type SubscriptionDialogFormValues = z.infer<Return<(typeof useFormSchemas)>['subscriptionDialogSchema']>;
type ShareLinkFormValues = z.infer<Return<(typeof useFormSchemas)>['shareLinkSchema']>;
type ThemeFormValues = z.infer<Return<(typeof useFormSchemas)>['themeSchema']>;
type NotificationFormValues = z.infer<Return<(typeof useFormSchemas)>['notificationSchema']>;


export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t, locale } = useLocale();

  const [deletingEntity, setDeletingEntity] = useState<{ type: 'category' | 'item' | 'notification', entity: WithId<CategoryType> | WithId<ContentItem> | WithId<NotificationType> } | null>(null);

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
  const { categorySchema, contentItemSchema, subscriptionDialogSchema, shareLinkSchema, themeSchema, notificationSchema } = useFormSchemas();
  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: { name: { ar: '', en: '' }, parentId: '', displayStyle: 'style1', fileTypes: '' } });
  const contentItemForm = useForm<ContentItemFormValues>({ resolver: zodResolver(contentItemSchema), defaultValues: { title: { ar: '', en: '' }, imageUrl: '', downloadUrl: '', prompt: '', instructions: { ar: '', en: '' }, videoUrl: '', screenshots: '', appVersion: '' } });
  const subscriptionDialogForm = useForm<SubscriptionDialogFormValues>({ resolver: zodResolver(subscriptionDialogSchema), defaultValues: { title: '', description: '', link: '', enabled: false } });
  const shareLinkForm = useForm<ShareLinkFormValues>({ resolver: zodResolver(shareLinkSchema), defaultValues: { url: '', text: '', enabled: false } });
  const themeForm = useForm<ThemeFormValues>({ resolver: zodResolver(themeSchema), defaultValues: { primaryColor: '', primaryColorDark: '' } });
  const notificationForm = useForm<NotificationFormValues>({ resolver: zodResolver(notificationSchema), defaultValues: { title: { ar: '', en: '' }, description: { ar: '', en: '' } } });


  // Effects to reset forms when editing state changes
  useEffect(() => {
    const defaultValues = { name: { ar: '', en: '' }, displayStyle: 'style1' as const, fileTypes: '', parentId: ''};
    if (editingCategory) {
      const name = editingCategory.name;
      categoryForm.reset({ 
        name: {
          ar: typeof name === 'object' && name !== null ? (name as LocalizedString).ar : (typeof name === 'string' ? name : ''),
          en: typeof name === 'object' && name !== null ? (name as LocalizedString).en : '',
        },
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
    const defaultValues: ContentItemFormValues = { title: { ar: '', en: '' }, imageUrl: '', downloadUrl: '', prompt: '', instructions: { ar: '', en: '' }, videoUrl: '', screenshots: '', appVersion: '' };
    if (editingItem) {
        const title = editingItem.title;
        const instructions = editingItem.instructions;
        contentItemForm.reset({ 
            title: {
              ar: typeof title === 'object' && title !== null ? (title as LocalizedString).ar : (typeof title === 'string' ? title : ''),
              en: typeof title === 'object' && title !== null ? (title as LocalizedString).en : '',
            },
            instructions: {
              ar: typeof instructions === 'object' && instructions !== null ? (instructions as LocalizedString).ar : (typeof instructions === 'string' ? instructions : ''),
              en: typeof instructions === 'object' && instructions !== null ? (instructions as LocalizedString).en : '',
            },
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
      toast({ title: t('categoryUpdated') });
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
      toast({ title: parentId ? t('subcategoryAdded') : t('mainCategoryAdded') });
    }
    categoryForm.reset({ name: { ar: '', en: '' }, displayStyle: 'style1', fileTypes: '', parentId: ''});
  };

  const onContentItemSubmit = (values: ContentItemFormValues) => {
    if (!firestore || !selectedContentCategory) return;
    const category = categoryMap.get(selectedContentCategory);
    if (!category) return;
    
    let itemData: Partial<Omit<ContentItem, 'id' | 'createdAt'>> = { title: values.title };

    if (['style1', 'style2'].includes(category.displayStyle)) {
        if (!values.imageUrl) { contentItemForm.setError('imageUrl', { message: t('imageUrlRequired') }); return; }
        if (!values.downloadUrl) { contentItemForm.setError('downloadUrl', { message: t('downloadUrlRequired') }); return; }
        itemData = { ...itemData, imageUrl: values.imageUrl, downloadUrl: values.downloadUrl };
    } else if (category.displayStyle === 'style3') {
        if (!values.imageUrl) { contentItemForm.setError('imageUrl', { message: t('imageUrlRequired') }); return; }
        if (!values.prompt) { contentItemForm.setError('prompt', { message: t('promptRequired') }); return; }
        itemData = { 
            ...itemData, 
            imageUrl: values.imageUrl, 
            prompt: values.prompt, 
            instructions: values.instructions, 
            downloadUrl: values.downloadUrl 
        };
    } else if (category.displayStyle === 'style4') {
        if (!values.videoUrl) { contentItemForm.setError('videoUrl', { message: t('videoUrlRequired') }); return; }
        const videoId = getYouTubeVideoId(values.videoUrl);
        if (!videoId) { contentItemForm.setError('videoUrl', { message: t('invalidYoutubeUrl') }); return; }
        itemData = { ...itemData, videoUrl: values.videoUrl, imageUrl: getYouTubeThumbnailUrl(videoId) };
    } else if (category.displayStyle === 'style5') {
        if (!values.imageUrl) { contentItemForm.setError('imageUrl', { message: t('iconUrlRequired') }); return; }
        if (!values.downloadUrl) { contentItemForm.setError('downloadUrl', { message: t('downloadUrlRequired') }); return; }
        
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
      toast({ title: t('contentUpdated') });
      setEditingItem(null);
    } else {
      const newOrder = sortedItems.length > 0 ? Math.max(...sortedItems.map(i => i.order ?? 0)) + 1 : 0;
      addDocumentNonBlocking(collection(firestore, 'categories', selectedContentCategory, 'items'), { ...itemData, order: newOrder, createdAt: serverTimestamp() });
      toast({ title: t('contentAdded') });
    }
    contentItemForm.reset({ title: {ar: '', en: ''}, imageUrl: '', downloadUrl: '', prompt: '', instructions: {ar: '', en: ''}, videoUrl: '', screenshots: '', appVersion: '' });
  };
  
  const onSubscriptionDialogSubmit = (values: SubscriptionDialogFormValues) => {
    if (!firestore || !subscriptionDialogRef) return;
    setDocumentNonBlocking(subscriptionDialogRef, values, { merge: true });
    toast({ title: t('dialogSettingsSaved') });
  };
  
  const onShareLinkSubmit = (values: ShareLinkFormValues) => {
    if (!firestore || !shareLinkRef) return;
    setDocumentNonBlocking(shareLinkRef, values, { merge: true });
    toast({ title: t('shareLinkSaved') });
  };
  
  const onThemeSubmit = (values: ThemeFormValues) => {
    if (!firestore || !themeRef) return;
    const dataToSave = {
        ...values,
        primaryColorDark: values.primaryColorDark || values.primaryColor,
    };
    setDocumentNonBlocking(themeRef, dataToSave, { merge: true });
    toast({ title: t('themeSaved') });
  };

  const onNotificationSubmit = (values: NotificationFormValues) => {
    if (!firestore) return;
    addDocumentNonBlocking(collection(firestore, 'notifications'), { ...values, createdAt: serverTimestamp() });
    toast({ title: t('notificationSent') });
    notificationForm.reset();
  };


  const handleDelete = () => {
    if (!firestore || !deletingEntity) return;
    const { type, entity } = deletingEntity;
    
    if(type === 'category') {
      deleteDocumentNonBlocking(doc(firestore, 'categories', entity.id));
      toast({ title: t('categoryDeleted') });
    } else if (type === 'item' && selectedContentCategory){
       deleteDocumentNonBlocking(doc(firestore, 'categories', selectedContentCategory, 'items', entity.id));
       toast({ title: t('contentDeleted') });
    } else if (type === 'notification') {
       deleteDocumentNonBlocking(doc(firestore, 'notifications', entity.id));
       toast({ title: t('notificationDeleted') });
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
          toast({ variant: 'destructive', title: t('orderUpdateFailed'), description: e.message });
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
          toast({ variant: 'destructive', title: t('orderUpdateFailed'), description: e.message });
        });
    }
  };

  const CategoryForm = () => (
    <div className="mb-6">
        <h3 className="text-xl font-bold mb-4">{editingCategory ? t('editCategory') : t('addCategory')}</h3>
        <Form {...categoryForm}>
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4 p-4 border rounded-lg bg-card">
            <FormField control={categoryForm.control} name="name.ar" render={({ field }) => (<FormItem><FormLabel>اسم القسم (العربية)</FormLabel><FormControl><Input placeholder={t('categoryName')} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={categoryForm.control} name="name.en" render={({ field }) => (<FormItem><FormLabel>Category Name (English)</FormLabel><FormControl><Input placeholder="Category Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <FormField
                control={categoryForm.control}
                name="parentId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('mainCategoryOptional')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('mainCategoryPlaceholder')} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="root">{t('mainCategory')}</SelectItem>
                                {mainCategories.filter(cat => cat.id !== editingCategory?.id).map((cat) => ( // Prevent self-parenting
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {getLocalizedString(cat.name, locale)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            {t('mainCategoryDescription')}
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField control={categoryForm.control} name="displayStyle" render={({ field }) => (<FormItem><FormLabel>{t('displayStyle')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="style1">{t('style1')}</SelectItem><SelectItem value="style2">{t('style2')}</SelectItem><SelectItem value="style3">{t('style3')}</SelectItem><SelectItem value="style4">{t('style4')}</SelectItem><SelectItem value="style5">{t('style5')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={categoryForm.control} name="fileTypes" render={({ field }) => (<FormItem><FormLabel>{t('fileTypes')}</FormLabel><FormControl><Input placeholder="PSD, AI" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex gap-2">
                {editingCategory && <Button type="button" variant="secondary" onClick={() => { setEditingCategory(null); }} className="w-full">{t('cancel')}</Button>}
                <Button type="submit" disabled={categoryForm.formState.isSubmitting} className="w-full">{editingCategory ? t('save') : t('add')}</Button>
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
            <h3 className="text-xl font-bold mb-4">{editingItem ? t('editItem') : t('addItem')} {t('inCategory', { categoryName: getLocalizedString(category.name, locale) })}</h3>
            <Form {...contentItemForm}>
                <form onSubmit={contentItemForm.handleSubmit(onContentItemSubmit)} className="space-y-4 p-4 border rounded-lg bg-card">
                    <FormField control={contentItemForm.control} name="title.ar" render={({ field }) => <FormItem><FormLabel>العنوان (العربية)</FormLabel><FormControl><Input placeholder={t('title')} {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={contentItemForm.control} name="title.en" render={({ field }) => <FormItem><FormLabel>Title (English)</FormLabel><FormControl><Input placeholder="Title" {...field} /></FormControl><FormMessage /></FormItem>} />
                    
                    {['style1', 'style2', 'style3'].includes(category.displayStyle) && <FormField control={contentItemForm.control} name="imageUrl" render={({ field }) => <FormItem><FormLabel>{t('imageUrl')}</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}
                    {category.displayStyle === 'style5' && <FormField control={contentItemForm.control} name="imageUrl" render={({ field }) => <FormItem><FormLabel>{t('iconUrl')}</FormLabel><FormControl><Input placeholder="https://example.com/icon.png" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}

                    {['style1', 'style2', 'style5'].includes(category.displayStyle) && <FormField control={contentItemForm.control} name="downloadUrl" render={({ field }) => <FormItem><FormLabel>{t('downloadUrl')}</FormLabel><FormControl><Input placeholder="https://example.com/file.zip" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}
                    
                    {category.displayStyle === 'style3' && (
                        <>
                            <FormField control={contentItemForm.control} name="instructions.ar" render={({ field }) => <FormItem><FormLabel>التعليمات (العربية - اختياري)</FormLabel><FormControl><Textarea placeholder={t('promptInstructionsPlaceholder')} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={contentItemForm.control} name="instructions.en" render={({ field }) => <FormItem><FormLabel>Instructions (English - Optional)</FormLabel><FormControl><Textarea placeholder="Instructions for using the prompt..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={contentItemForm.control} name="prompt" render={({ field }) => <FormItem><FormLabel>{t('prompt')}</FormLabel><FormControl><Textarea placeholder={t('promptPlaceholder')} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={contentItemForm.control} name="downloadUrl" render={({ field }) => <FormItem><FormLabel>{t('downloadUrlOptional')}</FormLabel><FormControl><Input placeholder="https://example.com/file.zip" {...field} value={field.value ?? ''} /></FormControl><FormDescription>{t('downloadUrlDescription')}</FormDescription><FormMessage /></FormItem>} />
                        </>
                    )}
                    
                    {category.displayStyle === 'style5' && (
                       <>
                        <FormField control={contentItemForm.control} name="appVersion" render={({ field }) => <FormItem><FormLabel>{t('appVersionOptional')}</FormLabel><FormControl><Input placeholder="1.0.0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={contentItemForm.control} name="instructions.ar" render={({ field }) => <FormItem><FormLabel>الوصف (العربية - اختياري)</FormLabel><FormControl><Textarea placeholder={t('itemDescriptionPlaceholder')} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={contentItemForm.control} name="instructions.en" render={({ field }) => <FormItem><FormLabel>Description (English - Optional)</FormLabel><FormControl><Textarea placeholder="Item description..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                       </>
                    )}

                    {category.displayStyle === 'style4' && <FormField control={contentItemForm.control} name="videoUrl" render={({ field }) => <FormItem><FormLabel>{t('videoUrlYoutube')}</FormLabel><FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />}

                    {category.displayStyle === 'style5' && <FormField control={contentItemForm.control} name="screenshots" render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('galleryImagesOptional')}</FormLabel>
                            <FormControl>
                                <Textarea placeholder="https://.../img1.png, https://.../img2.png" {...field} value={field.value ?? ''} dir="ltr" />
                            </FormControl>
                            <FormDescription>
                                {t('galleryImagesDescription')}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />}

                    <div className="flex gap-2">
                       {editingItem && <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} className="w-full">{t('cancel')}</Button>}
                       <Button type="submit" disabled={contentItemForm.formState.isSubmitting} className="w-full">{contentItemForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingItem ? t('save') : t('add'))}</Button>
                    </div>
                </form>
            </Form>
        </div>
    )
  };


  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <Header title={t('dashboard')} showMenu={false}>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => auth.signOut()}><LogOut className="ml-2 h-4 w-4" />{t('logout')}</Button>
        </Header>
        <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 space-y-12">
            <div>
                <CategoryForm />
        
                <h3 className="text-xl font-bold my-4">{t('currentCategories')}</h3>
                {isLoadingCategories ? <Skeleton className="h-40 w-full" /> : (
                    <Accordion type="single" collapsible className="w-full bg-card rounded-lg p-4 border">
                        {mainCategories.map((cat, index) => (
                            <AccordionItem value={cat.id} key={cat.id}>
                                <AccordionTrigger>
                                    <div className="flex-1 text-right">{getLocalizedString(cat.name, locale)}</div>
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
                                        {(subCategories.get(cat.id) || []).length === 0 && <p className="text-muted-foreground text-center">{t('noSubcategories')}</p>}
                                        {(subCategories.get(cat.id) || []).map((subCat, subIndex) => (
                                             <div key={subCat.id} className="flex items-center bg-card p-2 rounded-md border">
                                                 <p className="flex-1">{getLocalizedString(subCat.name, locale)}</p>
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
                    <Label>{t('selectCategoryToManage')}</Label>
                     <Select onValueChange={setSelectedContentCategory} value={selectedContentCategory}>
                      <SelectTrigger><SelectValue placeholder={t('selectCategory')} /></SelectTrigger>
                      <SelectContent>
                          {mainCategories.map(cat => (
                              <SelectGroup key={cat.id}>
                                  <SelectLabel>{getLocalizedString(cat.name, locale)}</SelectLabel>
                                  <SelectItem value={cat.id}>{t('mainCategoryAsOption', { name: getLocalizedString(cat.name, locale) })}</SelectItem>
                                  {(subCategories.get(cat.id) || []).map(subCat => (
                                      <SelectItem key={subCat.id} value={subCat.id} className="pr-8">{getLocalizedString(subCat.name, locale)}</SelectItem>
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
                            <CardTitle>{t('currentContentInCategory', { categoryName: getLocalizedString(categoryMap.get(selectedContentCategory)?.name, locale) || '' })}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {isLoadingItems ? <Skeleton className="h-10 w-full" /> : sortedItems.map((item, index) => (
                                    <div key={item.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <p className="flex-1">{getLocalizedString(item.title, locale)}</p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveItem(item, 'up')} disabled={index === 0}><ArrowUp/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMoveItem(item, 'down')} disabled={index === sortedItems.length - 1}><ArrowDown/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(item)}><Edit/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'item', entity: item })}><Trash2/></Button>
                                    </div>
                                ))}
                                {!isLoadingItems && sortedItems.length === 0 && (
                                    <p className="text-muted-foreground text-center p-4">{t('noContentYet')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">{t('appSettings')}</h2>
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>{t('themeSettings')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...themeForm}>
                                <form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                                    <FormField
                                        control={themeForm.control}
                                        name="primaryColor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('primaryColorLight')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="350 72% 51%" {...field} dir="ltr" />
                                                </FormControl>
                                                <FormDescription>
                                                    {t('hslFormatDescription')}
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
                                                <FormLabel>{t('primaryColorDark')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="350 72% 51%" {...field} dir="ltr" value={field.value ?? ''}/>
                                                </FormControl>
                                                 <FormDescription>
                                                    {t('hslFormatDescription')}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={themeForm.formState.isSubmitting} className="w-full">
                                      {themeForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : t('saveColor')}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>{t('subscriptionDialogSettings')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...subscriptionDialogForm}>
                                <form onSubmit={subscriptionDialogForm.handleSubmit(onSubscriptionDialogSubmit)} className="space-y-6">
                                    <FormField control={subscriptionDialogForm.control} name="enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">{t('enableDialog')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                                    <FormField control={subscriptionDialogForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>{t('dialogTitle')}</FormLabel><FormControl><Input placeholder={t('designerCompanion')} {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={subscriptionDialogForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>{t('dialogText')}</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={subscriptionDialogForm.control} name="link" render={({ field }) => ( <FormItem><FormLabel>{t('subscriptionLink')}</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" disabled={subscriptionDialogForm.formState.isSubmitting} className="w-full">
                                      {subscriptionDialogForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : t('saveSettings')}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('shareLinkSettings')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...shareLinkForm}>
                                <form onSubmit={shareLinkForm.handleSubmit(onShareLinkSubmit)} className="space-y-6">
                                     <FormField control={shareLinkForm.control} name="enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">{t('enableShareButton')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                                     <FormField control={shareLinkForm.control} name="url" render={({ field }) => ( <FormItem><FormLabel>{t('shareUrl')}</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                     <FormField control={shareLinkForm.control} name="text" render={({ field }) => ( <FormItem><FormLabel>{t('shareTextOptional')}</FormLabel><FormControl><Textarea placeholder="..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" disabled={shareLinkForm.formState.isSubmitting} className="w-full">
                                      {shareLinkForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : t('saveSettings')}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('sendNewNotification')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...notificationForm}>
                                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                                    <FormField control={notificationForm.control} name="title.ar" render={({ field }) => ( <FormItem><FormLabel>عنوان الإشعار (العربية)</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={notificationForm.control} name="title.en" render={({ field }) => ( <FormItem><FormLabel>Notification Title (English)</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={notificationForm.control} name="description.ar" render={({ field }) => ( <FormItem><FormLabel>نص الإشعار (العربية)</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={notificationForm.control} name="description.en" render={({ field }) => ( <FormItem><FormLabel>Notification Text (English)</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <Button type="submit" disabled={notificationForm.formState.isSubmitting} className="w-full">
                                      {notificationForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : t('sendNotification')}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('previousNotifications')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {isLoadingNotifications ? <Skeleton className="h-10 w-full" /> : (notifications && notifications.length > 0) ? notifications.map((notif) => (
                                    <div key={notif.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <div className="flex-1">
                                            <p className="font-bold">{getLocalizedString(notif.title, locale)}</p>
                                            <p className="text-sm text-muted-foreground">{getLocalizedString(notif.description, locale)}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'notification', entity: notif })}><Trash2/></Button>
                                    </div>
                                )) : <p className="text-muted-foreground text-center p-4">{t('noPreviousNotifications')}</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
        <AlertDialog open={!!deletingEntity} onOpenChange={(open) => !open && setDeletingEntity(null)}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle><AlertDialogDescription>{t('deleteConfirmation', {name: getLocalizedString(deletingEntity?.entity.name, locale) || getLocalizedString(deletingEntity?.entity.title, locale) || ''})}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
