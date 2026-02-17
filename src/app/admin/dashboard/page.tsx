'use client';

import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useFirestore, useCollection, useDoc, useMemoFirebase, WithId, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useAuth } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, orderBy, Timestamp, setDoc } from 'firebase/firestore';
import type { Category as CategoryType, ContentItem, SubscriptionDialogConfig, ShareLinkConfig, ThemeConfig, Notification as NotificationType, WhitelistEntry, PricingPlan, PaymentLinksConfig, SubscriptionRequest, PaymentMethod } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, PlusCircle, Loader2, ArrowUp, ArrowDown, LogOut, Bell, Crown, CheckCircle, HardHat } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/video-utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';
import { initializeApp, deleteApp, FirebaseError } from 'firebase/app';
import { getAuth as getAuthInstance, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/components/providers/CategoryProvider';


const colorRegex = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%\s*$/;

const useFormSchemas = () => {
    const categorySchema = z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        parentId: z.string().optional(),
        displayStyle: z.enum(['style1', 'style2', 'style3', 'style4', 'style5'], { required_error: "نمط العرض مطلوب" }),
        fileTypes: z.string().optional(),
        visibility: z.enum(['public', 'pro']).default('public'),
        isUnderMaintenance: z.boolean().default(false),
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
        visibility: z.enum(['public', 'pro']).default('public'),
    });
    
    const pricingPlanSchema = z.object({
        name: z.string().min(1, "اسم الخطة مطلوب"),
        price: z.string().min(1, "السعر مطلوب"),
        currency: z.string().min(1, "العملة مطلوبة"),
        frequency: z.string().min(1, "التكرار مطلوب"),
        description: z.string().min(1, "الوصف مطلوب"),
        features: z.string().min(1, "الميزات مطلوبة (مفصولة بفاصلة)"),
        isFeatured: z.boolean().default(false),
        enabled: z.boolean().default(true),
        link: z.string().url("رابط غير صالح").optional().or(z.literal('')),
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
        primaryColorDark: z.string().regex(colorRegex, { message: "صيغة اللون غير صحيحة. مثال: 350 72% 51%" }).or(z.literal("")).optional(),
    });

    const notificationSchema = z.object({
        title: z.string().min(1, "العنوان مطلوب"),
        description: z.string().min(1, "الوصف مطلوب"),
    });

    const whitelistSchema = z.object({
        email: z.string().email("البريد الإلكتروني غير صالح."),
        role: z.enum(['admin', 'editor', 'pro'], { required_error: "الدور مطلوب." }),
        password: z.string().optional(),
        activationCode: z.string().optional(),
        subscriptionDuration: z.preprocess(
            (val) => (val === "" || val === undefined || val === null ? undefined : parseInt(String(val), 10)),
            z.number({invalid_type_error: "يجب إدخال رقم"}).positive("المدة يجب أن تكون رقمًا موجبًا").optional()
        ),
    }).superRefine((data, ctx) => {
        if (data.role === 'pro' && !data.subscriptionDuration) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "مدة الاشتراك (بالأيام) مطلوبة لحسابات برو",
                path: ["subscriptionDuration"],
            });
        }
        if ((data.role === 'admin' || data.role === 'editor') && (!data.password || data.password.length < 6)) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "كلمة المرور مطلوبة ويجب أن تكون 6 أحرف على الأقل.",
                path: ["password"],
            });
        }
    });

    const paymentLinksSchema = z.object({
        paypalUrl: z.string().url("رابط بايبال غير صالح").or(z.literal("")).optional(),
        whatsappUrl: z.string().url("رابط واتساب غير صالح").or(z.literal("")).optional(),
        telegramUrl: z.string().url("رابط تلجرام غير صالح").or(z.literal("")).optional(),
        paymentInstructions: z.string().optional(),
    });

    const paymentMethodSchema = z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        icon: z.string().min(1, "الأيقونة مطلوبة (اسم أيقونة من Lucide)"),
        link: z.string().url("رابط غير صالح"),
        country: z.string().min(2, "الدولة مطلوبة"),
        enabled: z.boolean().default(true),
    });

    return { categorySchema, contentItemSchema, subscriptionDialogSchema, shareLinkSchema, themeSchema, notificationSchema, whitelistSchema, pricingPlanSchema, paymentLinksSchema, paymentMethodSchema };
}

type CategoryFormValues = z.infer<Return<(typeof useFormSchemas)>['categorySchema']>;
type ContentItemFormValues = z.infer<Return<(typeof useFormSchemas)>['contentItemSchema']>;
type SubscriptionDialogFormValues = z.infer<Return<(typeof useFormSchemas)>['subscriptionDialogSchema']>;
type ShareLinkFormValues = z.infer<Return<(typeof useFormSchemas)>['shareLinkSchema']>;
type ThemeFormValues = z.infer<Return<(typeof useFormSchemas)>['themeSchema']>;
type NotificationFormValues = z.infer<Return<(typeof useFormSchemas)>['notificationSchema']>;
type WhitelistFormValues = z.infer<Return<(typeof useFormSchemas)>['whitelistSchema']>;
type PricingPlanFormValues = z.infer<Return<(typeof useFormSchemas)>['pricingPlanSchema']>;
type PaymentLinksFormValues = z.infer<Return<(typeof useFormSchemas)>['paymentLinksSchema']>;
type PaymentMethodFormValues = z.infer<Return<(typeof useFormSchemas)>['paymentMethodSchema']>;


export default function AdminDashboardPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { isAdmin, isEditor } = useUserProfile();

  const [deletingEntity, setDeletingEntity] = useState<{ type: 'category' | 'item' | 'notification' | 'whitelist' | 'plan' | 'request' | 'paymentMethod', entity: WithId<any> } | null>(null);

  // Categories state
  const [editingCategory, setEditingCategory] = useState<WithId<CategoryType> | null>(null);

  // Content Items state
  const [selectedContentCategory, setSelectedContentCategory] = useState<string>('');
  const [editingItem, setEditingItem] = useState<WithId<ContentItem> | null>(null);
  const [sortedItems, setSortedItems] = useState<WithId<ContentItem>[]>([]);
  
  // Pricing plans state
  const [editingPlan, setEditingPlan] = useState<WithId<PricingPlan> | null>(null);

  // Payment methods state
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<WithId<PaymentMethod> | null>(null);


  // Data fetching
  const { mainCategories, subCategories, categoryMap, isLoadingCategories } = useCategories();
  
  const itemsCollectionQuery = useMemoFirebase(() => (firestore && selectedContentCategory) ? query(collection(firestore, 'categories', selectedContentCategory, 'items'), orderBy('order', 'asc')) : null, [firestore, selectedContentCategory]);
  const { data: items, isLoading: isLoadingItems } = useCollection<ContentItem>(itemsCollectionQuery);

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
  
  const pricingPlansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricingPlans'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: pricingPlans, isLoading: isLoadingPlans } = useCollection<PricingPlan>(pricingPlansQuery);

  const paymentLinksRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'paymentLinks') : null, [firestore]);
  const { data: paymentLinksData } = useDoc<PaymentLinksConfig>(paymentLinksRef);
  
  const subscriptionRequestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'subscriptionRequests'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: subscriptionRequests, isLoading: isLoadingRequests } = useCollection<SubscriptionRequest>(subscriptionRequestsQuery);

  const paymentMethodsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'paymentMethods'), orderBy('order', 'asc')) : null, [firestore]);
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);


  useEffect(() => {
    if (items) {
        setSortedItems(items);
    } else {
        setSortedItems([]);
    }
  }, [items]);


  // Forms
  const { categorySchema, contentItemSchema, subscriptionDialogSchema, shareLinkSchema, themeSchema, notificationSchema, whitelistSchema, pricingPlanSchema, paymentLinksSchema, paymentMethodSchema } = useFormSchemas();
  const categoryForm = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: { name: '', parentId: '', displayStyle: 'style1', fileTypes: '', visibility: 'public', isUnderMaintenance: false } });
  const contentItemForm = useForm<ContentItemFormValues>({ resolver: zodResolver(contentItemSchema), defaultValues: { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', screenshots: '', appVersion: '', visibility: 'public' } });
  const pricingPlanForm = useForm<PricingPlanFormValues>({ resolver: zodResolver(pricingPlanSchema), defaultValues: { name: '', price: '', currency: 'ر.س', frequency: '/شهرياً', description: '', features: '', isFeatured: false, enabled: true, link: '' } });
  const subscriptionDialogForm = useForm<SubscriptionDialogFormValues>({ resolver: zodResolver(subscriptionDialogSchema), defaultValues: { title: '', description: '', link: '', enabled: false } });
  const shareLinkForm = useForm<ShareLinkFormValues>({ resolver: zodResolver(shareLinkSchema), defaultValues: { url: '', text: '', enabled: false } });
  const themeForm = useForm<ThemeFormValues>({ resolver: zodResolver(themeSchema), defaultValues: { primaryColor: '', primaryColorDark: '' } });
  const notificationForm = useForm<NotificationFormValues>({ resolver: zodResolver(notificationSchema), defaultValues: { title: '', description: '' } });
  const whitelistForm = useForm<WhitelistFormValues>({ resolver: zodResolver(whitelistSchema), defaultValues: { email: '', role: 'pro', password: '', activationCode: '' } });
  const paymentLinksForm = useForm<PaymentLinksFormValues>({ resolver: zodResolver(paymentLinksSchema), defaultValues: { paypalUrl: '', whatsappUrl: '', telegramUrl: '', paymentInstructions: '' } });
  const paymentMethodForm = useForm<PaymentMethodFormValues>({ resolver: zodResolver(paymentMethodSchema), defaultValues: { name: '', icon: 'CreditCard', link: '', country: 'ALL', enabled: true } });
  const watchWhitelistRole = whitelistForm.watch('role');


  // Effects to reset forms when editing state changes
  useEffect(() => {
    const defaultValues = { name: '', displayStyle: 'style1' as const, fileTypes: '', parentId: '', visibility: 'public' as const, isUnderMaintenance: false};
    if (editingCategory) {
      categoryForm.reset({ 
        name: editingCategory.name,
        displayStyle: editingCategory.displayStyle, 
        fileTypes: editingCategory.fileTypes || '',
        parentId: editingCategory.parentId || '',
        visibility: editingCategory.visibility || 'public',
        isUnderMaintenance: editingCategory.isUnderMaintenance || false,
      });
    }
    else {
        categoryForm.reset(defaultValues);
    }
  }, [editingCategory, categoryForm]);


  useEffect(() => {
    const defaultValues: ContentItemFormValues = { title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', screenshots: '', appVersion: '', visibility: 'public' };
    if (editingItem) {
        contentItemForm.reset({ 
            title: editingItem.title,
            instructions: editingItem.instructions || '',
            imageUrl: editingItem.imageUrl || '', 
            downloadUrl: editingItem.downloadUrl || '', 
            prompt: editingItem.prompt || '', 
            videoUrl: editingItem.videoUrl || '',
            screenshots: (editingItem.screenshots || []).join(', '),
            appVersion: editingItem.appVersion || '',
            visibility: editingItem.visibility || 'public',
        });
    }
    else contentItemForm.reset(defaultValues);
  }, [editingItem, contentItemForm]);
  
   useEffect(() => {
    if (editingPlan) {
      pricingPlanForm.reset({
        ...editingPlan,
        features: editingPlan.features.join(', '),
      });
    } else {
      pricingPlanForm.reset({ name: '', price: '', currency: 'ر.س', frequency: '/شهرياً', description: '', features: '', isFeatured: false, enabled: true, link: '' });
    }
  }, [editingPlan, pricingPlanForm]);

  useEffect(() => {
    if (editingPaymentMethod) {
      paymentMethodForm.reset(editingPaymentMethod);
    } else {
      paymentMethodForm.reset({ name: '', icon: 'CreditCard', link: '', country: 'ALL', enabled: true });
    }
  }, [editingPaymentMethod, paymentMethodForm]);

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

  useEffect(() => {
    if (paymentLinksData) {
        paymentLinksForm.reset(paymentLinksData);
    } else {
        paymentLinksForm.reset({ paypalUrl: '', whatsappUrl: '', telegramUrl: '', paymentInstructions: '' });
    }
  }, [paymentLinksData, paymentLinksForm]);


  // Handlers
  const onCategorySubmit = (values: CategoryFormValues) => {
    if (!firestore || !isAdmin) return;
    
    const parentId = (values.parentId === 'root' || !values.parentId) ? null : values.parentId;

    if (editingCategory) {
      const dataToSave = {
        name: values.name,
        displayStyle: values.displayStyle,
        fileTypes: values.fileTypes,
        parentId: parentId,
        visibility: values.visibility,
        isUnderMaintenance: values.isUnderMaintenance,
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
        visibility: values.visibility,
        isUnderMaintenance: values.isUnderMaintenance,
        order: newOrder, 
        createdAt: serverTimestamp() 
      };
      addDocumentNonBlocking(collection(firestore, 'categories'), data);
      toast({ title: parentId ? "تم إضافة قسم فرعي" : "تم إضافة قسم رئيسي" });
    }
    categoryForm.reset({ name: '', displayStyle: 'style1', fileTypes: '', parentId: '', visibility: 'public', isUnderMaintenance: false });
  };

  const onContentItemSubmit = (values: ContentItemFormValues) => {
    if (!firestore || !selectedContentCategory) return;
    const category = categoryMap.get(selectedContentCategory);
    if (!category) return;
    
    let itemData: Partial<Omit<ContentItem, 'id' | 'createdAt'>> = { title: values.title, visibility: values.visibility };

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
      if (!isAdmin) {
          toast({ variant: "destructive", title: "غير مصرح لك" });
          return;
      }
      updateDocumentNonBlocking(doc(firestore, 'categories', selectedContentCategory, 'items', editingItem.id), itemData);
      toast({ title: "تم تحديث المحتوى" });
      setEditingItem(null);
    } else {
      const status = isAdmin ? 'approved' : 'pending';
      const newOrder = sortedItems.length > 0 ? Math.max(...sortedItems.map(i => i.order ?? 0)) + 1 : 0;
      addDocumentNonBlocking(collection(firestore, 'categories', selectedContentCategory, 'items'), { ...itemData, status, order: newOrder, createdAt: serverTimestamp() });
      toast({ title: "تم إضافة محتوى جديد" });
    }
    contentItemForm.reset({ title: '', imageUrl: '', downloadUrl: '', prompt: '', instructions: '', videoUrl: '', screenshots: '', appVersion: '', visibility: 'public' });
  };

  const onPricingPlanSubmit = (values: PricingPlanFormValues) => {
    if (!firestore || !isAdmin) return;
    
    const planData = {
      ...values,
      features: values.features.split(',').map(f => f.trim()).filter(f => f),
    };

    if (editingPlan) {
      updateDocumentNonBlocking(doc(firestore, 'pricingPlans', editingPlan.id), planData);
      toast({ title: 'تم تحديث خطة الأسعار' });
      setEditingPlan(null);
    } else {
      const newOrder = pricingPlans ? (pricingPlans.length > 0 ? Math.max(...pricingPlans.map(p => p.order ?? 0)) + 1 : 0) : 0;
      addDocumentNonBlocking(collection(firestore, 'pricingPlans'), { ...planData, order: newOrder });
      toast({ title: 'تم إضافة خطة أسعار جديدة' });
    }
    pricingPlanForm.reset();
  };

  const onPaymentMethodSubmit = (values: PaymentMethodFormValues) => {
    if (!firestore || !isAdmin) return;
    
    if (editingPaymentMethod) {
      updateDocumentNonBlocking(doc(firestore, 'paymentMethods', editingPaymentMethod.id), values);
      toast({ title: 'تم تحديث طريقة الدفع' });
      setEditingPaymentMethod(null);
    } else {
      const newOrder = paymentMethods ? (paymentMethods.length > 0 ? Math.max(...paymentMethods.map(p => p.order ?? 0)) + 1 : 0) : 0;
      addDocumentNonBlocking(collection(firestore, 'paymentMethods'), { ...values, order: newOrder });
      toast({ title: 'تم إضافة طريقة دفع جديدة' });
    }
    paymentMethodForm.reset({ name: '', icon: 'CreditCard', link: '', country: 'ALL', enabled: true });
  };
  
  const onSubscriptionDialogSubmit = (values: SubscriptionDialogFormValues) => {
    if (!firestore || !subscriptionDialogRef || !isAdmin) return;
    setDocumentNonBlocking(subscriptionDialogRef, values, { merge: true });
    toast({ title: "تم حفظ إعدادات النافذة المنبثقة" });
  };
  
  const onShareLinkSubmit = (values: ShareLinkFormValues) => {
    if (!firestore || !shareLinkRef || !isAdmin) return;
    setDocumentNonBlocking(shareLinkRef, values, { merge: true });
    toast({ title: "تم حفظ إعدادات رابط المشاركة" });
  };
  
  const onThemeSubmit = (values: ThemeFormValues) => {
    if (!firestore || !themeRef || !isAdmin) return;
    const dataToSave = {
        ...values,
        primaryColorDark: values.primaryColorDark || values.primaryColor,
    };
    setDocumentNonBlocking(themeRef, dataToSave, { merge: true });
    toast({ title: "تم حفظ لون الموقع" });
  };

  const onNotificationSubmit = (values: NotificationFormValues) => {
    if (!firestore || !isAdmin) return;
    addDocumentNonBlocking(collection(firestore, 'notifications'), { ...values, createdAt: serverTimestamp() });
    toast({ title: "تم إرسال الإشعار بنجاح" });
    notificationForm.reset();
  };

  const onWhitelistSubmit = async (values: WhitelistFormValues) => {
    if (!firestore || !isAdmin) return;
    
    const email = values.email.toLowerCase();

    if (values.role === 'admin' || values.role === 'editor') {
        if (!values.password) {
            whitelistForm.setError('password', { message: 'كلمة المرور مطلوبة للمسؤول أو المحرر.' });
            return;
        }

        const tempAppName = `temp-user-creation-${Date.now()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuthInstance(tempApp);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(tempAuth, email, values.password);
            const newUser = userCredential.user;

            const batch = writeBatch(firestore);
            
            const whitelistRef = doc(firestore, 'whitelist', email);
            batch.set(whitelistRef, {
                email: email,
                role: values.role,
                createdAt: serverTimestamp(),
                isActivated: true,
                activatedByUid: newUser.uid,
            });

            const userProfileRef = doc(firestore, 'users', newUser.uid);
            batch.set(userProfileRef, {
                email: email,
                subscriptionTier: 'free',
                createdAt: serverTimestamp(),
                displayName: email.split('@')[0],
            });

            await batch.commit();

            const roleName = values.role === 'admin' ? 'المسؤول' : 'المحرر';
            toast({ title: `تم إنشاء حساب ${roleName} بنجاح` });
            whitelistForm.reset({ email: '', role: 'pro', password: '', activationCode: '' });

        } catch (e: any) {
            const roleName = values.role === 'admin' ? 'المسؤول' : 'المحرر';
            let errorMessage = `فشل إنشاء حساب ${roleName}.`;
            if (e instanceof FirebaseError) {
                if (e.code === 'auth/email-already-in-use') {
                    errorMessage = 'هذا البريد الإلكتروني مستخدم بالفعل.';
                } else if (e.code === 'auth/weak-password') {
                    errorMessage = 'كلمة المرور ضعيفة جداً، يجب أن تكون 6 أحرف على الأقل.';
                }
            }
            toast({ variant: 'destructive', title: "خطأ", description: errorMessage });
        } finally {
            await deleteApp(tempApp);
        }

    } else if (values.role === 'pro') {
        const docRef = doc(firestore, 'whitelist', email);
        
        const dataToSet: Partial<WhitelistEntry> = {
          email: email,
          role: values.role,
          activationCode: values.activationCode,
          createdAt: serverTimestamp(),
          isActivated: false,
          activatedByUid: null,
          deviceFingerprint: null,
        };

        if (values.role === 'pro' && values.subscriptionDuration) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + values.subscriptionDuration);
            
            (dataToSet as any).subscriptionStartDate = Timestamp.fromDate(startDate);
            (dataToSet as any).subscriptionEndDate = Timestamp.fromDate(endDate);
        }

        await setDoc(docRef, dataToSet, { merge: true });
        
        toast({ title: "تم إضافة المستخدم إلى قائمة التفعيل 'برو'." });
        whitelistForm.reset({ email: '', role: 'pro', password: '', activationCode: '' });
    }
  };
  
  const onPaymentLinksSubmit = (values: PaymentLinksFormValues) => {
    if (!firestore || !paymentLinksRef || !isAdmin) return;
    setDocumentNonBlocking(paymentLinksRef, values, { merge: true });
    toast({ title: "تم حفظ روابط الدفع والتواصل" });
  };


  const handleDelete = () => {
    if (!firestore || !deletingEntity || !isAdmin) return;
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
    } else if (type === 'plan') {
       deleteDocumentNonBlocking(doc(firestore, 'pricingPlans', entity.id));
       toast({ title: "تم حذف خطة الأسعار" });
    } else if (type === 'request') {
       deleteDocumentNonBlocking(doc(firestore, 'subscriptionRequests', entity.id));
       toast({ title: "تم حذف طلب الاشتراك" });
    } else if (type === 'paymentMethod') {
       deleteDocumentNonBlocking(doc(firestore, 'paymentMethods', entity.id));
       toast({ title: "تم حذف طريقة الدفع" });
    }
    
    setDeletingEntity(null);
  };
  
  const handleMove = (list: WithId<{order?: number}>[], index: number, direction: 'up' | 'down', collectionPath: string) => {
    if (!firestore || !isAdmin) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= list.length) return;

    const batch = writeBatch(firestore);
    const currentItem = list[index];
    const targetItem = list[targetIndex];

    if (currentItem && targetItem) {
        batch.update(doc(firestore, collectionPath, currentItem.id), { order: targetItem.order });
        batch.update(doc(firestore, collectionPath, targetItem.id), { order: currentItem.order });
        batch.commit().catch((e) => {
          toast({ variant: 'destructive', title: "فشل تحديث الترتيب", description: e.message });
        });
    }
  };

  const handleApprove = (itemId: string) => {
    if (!firestore || !selectedContentCategory || !isAdmin) return;
    const itemRef = doc(firestore, 'categories', selectedContentCategory, 'items', itemId);
    updateDocumentNonBlocking(itemRef, { status: 'approved' });
    toast({ title: "تمت الموافقة على المحتوى" });
  };


  const CategoryForm = () => (
    <Card>
        <CardHeader>
            <CardTitle>{editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
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
                                    {mainCategories.filter(cat => cat.id !== editingCategory?.id).map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
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
                <FormField control={categoryForm.control} name="visibility" render={({ field }) => (<FormItem><FormLabel>الصلاحية</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2 rtl:space-x-reverse"><RadioGroupItem value="public" id="cat-public" /><Label htmlFor="cat-public">عام</Label></FormItem><FormItem className="flex items-center space-x-2 rtl:space-x-reverse"><RadioGroupItem value="pro" id="cat-pro" /><Label htmlFor="cat-pro">برو</Label></FormItem></RadioGroup><FormMessage /></FormItem>)} />
                
                <FormField
                    control={categoryForm.control}
                    name="isUnderMaintenance"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4">
                            <div className="space-y-0.5">
                                <FormLabel>قفل للصيانة</FormLabel>
                                <FormDescription>
                                    عرض رسالة صيانة بدلاً من المحتوى.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex gap-2 pt-4">
                    {editingCategory && <Button type="button" variant="secondary" onClick={() => { setEditingCategory(null); }} className="w-full">إلغاء</Button>}
                    <Button type="submit" disabled={categoryForm.formState.isSubmitting} className="w-full">{editingCategory ? "حفظ" : "إضافة"}</Button>
                </div>
              </form>
            </Form>
        </CardContent>
    </Card>
  );

  const ContentItemForm = () => {
    const category = categoryMap.get(selectedContentCategory);
    if (!category) return null;
    return (
        <Card>
            <CardHeader>
                <CardTitle>{editingItem ? "تعديل محتوى" : "إضافة محتوى جديد"} في "{category.name}"</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...contentItemForm}>
                    <form onSubmit={contentItemForm.handleSubmit(onContentItemSubmit)} className="space-y-4">
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

                        <FormField control={contentItemForm.control} name="visibility" render={({ field }) => (<FormItem><FormLabel>الصلاحية</FormLabel><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2 rtl:space-x-reverse"><RadioGroupItem value="public" id="item-public" /><Label htmlFor="item-public">عام</Label></FormItem><FormItem className="flex items-center space-x-2 rtl:space-x-reverse"><RadioGroupItem value="pro" id="item-pro" /><Label htmlFor="item-pro">برو</Label></FormItem></RadioGroup><FormMessage /></FormItem>)} />

                        <div className="flex gap-2">
                        {editingItem && <Button type="button" variant="secondary" onClick={() => setEditingItem(null)} className="w-full">إلغاء</Button>}
                        <Button type="submit" disabled={contentItemForm.formState.isSubmitting} className="w-full">{contentItemForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : (editingItem ? "حفظ" : "إضافة")}</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
  };


  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <Header title="لوحة التحكم" showMenu={false}>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => auth.signOut()}><LogOut className="ml-2 h-4 w-4" />تسجيل الخروج</Button>
        </Header>
        <main className="flex-1 container mx-auto max-w-5xl py-8 px-4">
            <Tabs defaultValue="categories" dir="rtl">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-6 mb-6 h-auto">
                    <TabsTrigger value="categories" className="py-2">الأقسام والمحتوى</TabsTrigger>
                    {isAdmin && <TabsTrigger value="plans" className="py-2">خطط الأسعار</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="paymentMethods" className="py-2">طرق الدفع</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="requests" className="py-2">طلبات الاشتراك</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="users" className="py-2">المستخدمين</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="settings" className="py-2">الإعدادات العامة</TabsTrigger>}
                </TabsList>

                <TabsContent value="categories" className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                            {isAdmin && <CategoryForm />}
                            {isAdmin && <Card>
                                <CardHeader>
                                    <CardTitle>الأقسام الحالية</CardTitle>
                                </CardHeader>
                                <CardContent>
                                {isLoadingCategories ? <Skeleton className="h-40 w-full" /> : (
                                    <Accordion type="single" collapsible className="w-full">
                                        {mainCategories.map((cat, index) => (
                                            <AccordionItem value={cat.id} key={cat.id}>
                                                <AccordionTrigger>
                                                    <div className="flex items-center gap-2 flex-1 text-right">
                                                        {cat.name}
                                                        {cat.visibility === 'pro' && <Crown className="h-4 w-4 text-yellow-500" />}
                                                        {cat.isUnderMaintenance && <HardHat className="h-4 w-4 text-orange-500" />}
                                                    </div>
                                                    {isAdmin && <div className="flex items-center gap-2 mr-auto">
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(mainCategories, index, 'up', 'categories') }} disabled={index === 0}><span><ArrowUp/></span></Button>
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(mainCategories, index, 'down', 'categories') }} disabled={index === mainCategories.length - 1}><span><ArrowDown/></span></Button>
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}><span><Edit/></span></Button>
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingEntity({ type: 'category', entity: cat }); }}><span><Trash2/></span></Button>
                                                    </div>}
                                                </AccordionTrigger>
                                                <AccordionContent className="p-4 bg-secondary rounded-md">
                                                    <div className="space-y-2">
                                                        {(subCategories.get(cat.id) || []).length === 0 && <p className="text-muted-foreground text-center">لا توجد أقسام فرعية.</p>}
                                                        {(subCategories.get(cat.id) || []).map((subCat, subIndex) => (
                                                            <div key={subCat.id} className="flex items-center bg-card p-2 rounded-md border">
                                                                <p className="flex-1 flex items-center gap-2">{subCat.name} {subCat.visibility === 'pro' && <Crown className="h-4 w-4 text-yellow-500" />} {subCat.isUnderMaintenance && <HardHat className="h-4 w-4 text-orange-500" />}</p>
                                                                {isAdmin && <>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(subCategories.get(cat.id)!, subIndex, 'up', 'categories')} disabled={subIndex === 0}><ArrowUp/></Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(subCategories.get(cat.id)!, subIndex, 'down', 'categories')} disabled={subIndex === (subCategories.get(cat.id)?.length ?? 1) - 1}><ArrowDown/></Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setEditingCategory(subCat); }}><Edit/></Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'category', entity: subCat })}><Trash2/></Button>
                                                                </>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                )}
                                </CardContent>
                            </Card>}
                        </div>
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-4 space-y-2">
                                    <Label>اختر قسمًا لإدارة محتواه</Label>
                                    <Select onValueChange={setSelectedContentCategory} value={selectedContentCategory}>
                                    <SelectTrigger><SelectValue placeholder="اختر قسم..." /></SelectTrigger>
                                    <SelectContent>
                                        {mainCategories.map(cat => (
                                            <SelectGroup key={cat.id}>
                                                <SelectLabel>{cat.name}</SelectLabel>
                                                <SelectItem value={cat.id}>{cat.name} (قسم رئيسي)</SelectItem>
                                                {(subCategories.get(cat.id) || []).map(subCat => (
                                                    <SelectItem key={subCat.id} value={subCat.id} className="pr-8">{subCat.name}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>
                            {selectedContentCategory && <ContentItemForm />}
                            {selectedContentCategory && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>المحتوى الحالي في "{categoryMap.get(selectedContentCategory)?.name || ''}"</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {isLoadingItems ? <Skeleton className="h-10 w-full" /> : sortedItems.map((item, index) => (
                                                <div key={item.id} className="flex items-center gap-2 bg-secondary p-2 rounded-md">
                                                    <p className="flex-1 flex items-center gap-2">{item.title} {item.visibility === 'pro' && <Crown className="h-4 w-4 text-yellow-500" />}</p>
                                                    {item.status === 'pending' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">قيد المراجعة</Badge>}
                                                    {isAdmin && item.status === 'pending' && <Button size="sm" onClick={() => handleApprove(item.id)}><CheckCircle className="ml-1 h-4 w-4"/> موافقة</Button>}
                                                    {isAdmin && <>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(sortedItems, index, 'up', `categories/${selectedContentCategory}/items`)} disabled={index === 0}><ArrowUp/></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(sortedItems, index, 'down', `categories/${selectedContentCategory}/items`)} disabled={index === sortedItems.length - 1}><ArrowDown/></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(item)}><Edit/></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'item', entity: item })}><Trash2/></Button>
                                                    </>}
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
                    </div>
                </TabsContent>

                {isAdmin && <TabsContent value="plans">
                     <Card>
                        <CardHeader>
                            <CardTitle>إدارة خطط الأسعار</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6">
                                <h3 className="text-lg font-bold mb-4">{editingPlan ? 'تعديل الخطة' : 'إضافة خطة جديدة'}</h3>
                                <Form {...pricingPlanForm}>
                                <form onSubmit={pricingPlanForm.handleSubmit(onPricingPlanSubmit)} className="space-y-4 p-4 border rounded-lg bg-background">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={pricingPlanForm.control} name="name" render={({ field }) => <FormItem><FormLabel>اسم الخطة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField control={pricingPlanForm.control} name="price" render={({ field }) => <FormItem><FormLabel>السعر</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField control={pricingPlanForm.control} name="currency" render={({ field }) => <FormItem><FormLabel>العملة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField control={pricingPlanForm.control} name="frequency" render={({ field }) => <FormItem><FormLabel>التكرار</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                    <FormField control={pricingPlanForm.control} name="description" render={({ field }) => <FormItem><FormLabel>الوصف</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField control={pricingPlanForm.control} name="features" render={({ field }) => <FormItem><FormLabel>الميزات</FormLabel><FormControl><Textarea {...field} /></FormControl><FormDescription>افصل بين الميزات بفاصلة (,)</FormDescription><FormMessage /></FormItem>} />
                                    <FormField control={pricingPlanForm.control} name="link" render={({ field }) => <FormItem><FormLabel>رابط الزر (اختياري)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    <div className="flex justify-between items-center">
                                        <FormField control={pricingPlanForm.control} name="isFeatured" render={({ field }) => <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>مميزة؟</FormLabel></FormItem>} />
                                        <FormField control={pricingPlanForm.control} name="enabled" render={({ field }) => <FormItem className="flex items-center gap-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>مفعلة؟</FormLabel></FormItem>} />
                                    </div>
                                    <div className="flex gap-2">
                                        {editingPlan && <Button type="button" variant="secondary" onClick={() => { setEditingPlan(null); pricingPlanForm.reset(); }} className="w-full">إلغاء</Button>}
                                        <Button type="submit" disabled={pricingPlanForm.formState.isSubmitting} className="w-full">{editingPlan ? 'حفظ' : 'إضافة'}</Button>
                                    </div>
                                </form>
                                </Form>
                            </div>
                             <h3 className="text-lg font-bold my-4">الخطط الحالية</h3>
                                {isLoadingPlans ? <Skeleton className="h-20 w-full" /> : (
                                <div className="space-y-2">
                                    {(pricingPlans || []).map((plan, index) => (
                                    <div key={plan.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <p className="flex-1 font-semibold">{plan.name} ({plan.price} {plan.currency}{plan.frequency})</p>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(pricingPlans!, index, 'up', 'pricingPlans')} disabled={index === 0}><ArrowUp/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(pricingPlans!, index, 'down', 'pricingPlans')} disabled={index === pricingPlans!.length - 1}><ArrowDown/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPlan(plan)}><Edit/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'plan', entity: plan })}><Trash2/></Button>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                )}
                        </CardContent>
                    </Card>
                </TabsContent>}

                {isAdmin && <TabsContent value="paymentMethods">
                     <Card>
                        <CardHeader>
                            <CardTitle>إدارة طرق الدفع</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6">
                                <h3 className="text-lg font-bold mb-4">{editingPaymentMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}</h3>
                                <Form {...paymentMethodForm}>
                                <form onSubmit={paymentMethodForm.handleSubmit(onPaymentMethodSubmit)} className="space-y-4 p-4 border rounded-lg bg-background">
                                    <FormField control={paymentMethodForm.control} name="name" render={({ field }) => <FormItem><FormLabel>اسم الطريقة</FormLabel><FormControl><Input placeholder="PayPal" {...field} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField control={paymentMethodForm.control} name="icon" render={({ field }) => <FormItem><FormLabel>أيقونة (Lucide)</FormLabel><FormControl><Input placeholder="CreditCard" {...field} /></FormControl><FormDescription>ابحث عن اسم الأيقونة في موقع <a href="https://lucide.dev/icons/" target="_blank" className="text-primary underline">lucide.dev/icons</a></FormDescription><FormMessage /></FormItem>} />
                                    <FormField control={paymentMethodForm.control} name="link" render={({ field }) => <FormItem><FormLabel>رابط الدفع</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>} />
                                    <FormField
                                        control={paymentMethodForm.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>الدولة</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} defaultValue="ALL">
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ALL">كل الدول (Global)</SelectItem>
                                                    <SelectItem value="SA">المملكة العربية السعودية</SelectItem>
                                                    <SelectItem value="YE">اليمن</SelectItem>
                                                    <SelectItem value="EG">مصر</SelectItem>
                                                    <SelectItem value="AE">الإمارات العربية المتحدة</SelectItem>
                                                    <SelectItem value="KW">الكويت</SelectItem>
                                                    <SelectItem value="QA">قطر</SelectItem>
                                                    <SelectItem value="BH">البحرين</SelectItem>
                                                    <SelectItem value="OM">عمان</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>اختر الدولة التي ستظهر بها طريقة الدفع هذه.</FormDescription>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField control={paymentMethodForm.control} name="enabled" render={({ field }) => <FormItem className="flex items-center gap-2 pt-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>مفعلة؟</FormLabel></FormItem>} />
                                    <div className="flex gap-2">
                                        {editingPaymentMethod && <Button type="button" variant="secondary" onClick={() => { setEditingPaymentMethod(null); }} className="w-full">إلغاء</Button>}
                                        <Button type="submit" disabled={paymentMethodForm.formState.isSubmitting} className="w-full">{editingPaymentMethod ? 'حفظ' : 'إضافة'}</Button>
                                    </div>
                                </form>
                                </Form>
                            </div>
                             <h3 className="text-lg font-bold my-4">طرق الدفع الحالية</h3>
                                {isLoadingPaymentMethods ? <Skeleton className="h-20 w-full" /> : (
                                <div className="space-y-2">
                                    {(paymentMethods || []).map((method, index) => (
                                    <div key={method.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <p className="flex-1 font-semibold flex items-center gap-2">
                                            {method.name}
                                            <Badge variant="secondary" className="font-mono">{method.country}</Badge>
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(paymentMethods!, index, 'up', 'paymentMethods')} disabled={index === 0}><ArrowUp/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMove(paymentMethods!, index, 'down', 'paymentMethods')} disabled={index === paymentMethods!.length - 1}><ArrowDown/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPaymentMethod(method)}><Edit/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'paymentMethod', entity: method })}><Trash2/></Button>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                )}
                        </CardContent>
                    </Card>
                </TabsContent>}

                {isAdmin && <TabsContent value="requests" className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>طلبات الاشتراك الواردة</CardTitle>
                            <CardDescription>هنا تظهر الطلبات الجديدة من المستخدمين للاشتراك في الخطط.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {isLoadingRequests ? <Skeleton className="h-20 w-full" /> : (subscriptionRequests && subscriptionRequests.length > 0) ? subscriptionRequests.map((req) => (
                                    <Card key={req.id} className="bg-secondary">
                                        <CardHeader className="flex flex-row items-start gap-4 py-4">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{req.name}</CardTitle>
                                                <CardDescription>
                                                    طلب اشتراك في خطة: <span className="font-bold text-primary">{req.planName}</span>
                                                </CardDescription>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'request', entity: req })}>
                                                <Trash2 />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm pt-0 pb-4">
                                            <p><strong>البريد الإلكتروني:</strong> <span className="font-mono">{req.email}</span></p>
                                            <p><strong>رقم الهاتف:</strong> <span className="font-mono" dir="ltr">{req.phoneNumber}</span></p>
                                            <p className="text-xs text-muted-foreground pt-2">
                                                تاريخ الطلب: {safeFormatFirebaseTimestamp(req.createdAt)}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )) : <p className="text-muted-foreground text-center p-4">لا توجد طلبات اشتراك حالياً.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>}


                 {isAdmin && <TabsContent value="users" className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>تفعيل المستخدمين</CardTitle>
                            <CardDescription>أضف مستخدمين بصلاحيات "Admin" أو "Pro".</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...whitelistForm}>
                                <form onSubmit={whitelistForm.handleSubmit(onWhitelistSubmit)} className="space-y-6">
                                    <FormField control={whitelistForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>البريد الإلكتروني للمستخدم</FormLabel><FormControl><Input placeholder="user@example.com" {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                    
                                    <FormField control={whitelistForm.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الصلاحية</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="pro">Pro</SelectItem>
                                                    <SelectItem value="editor">Editor (إضافة محتوى فقط)</SelectItem>
                                                    <SelectItem value="admin">Admin (صلاحيات كاملة)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    {(watchWhitelistRole === 'admin' || watchWhitelistRole === 'editor') && (
                                        <FormField
                                            control={whitelistForm.control}
                                            name="password"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>كلمة المرور</FormLabel>
                                                <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} dir="ltr" value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    )}
                                    
                                    {watchWhitelistRole === 'pro' && (
                                        <>
                                            <FormField control={whitelistForm.control} name="activationCode" render={({ field }) => ( <FormItem><FormLabel>كود التفعيل (اختياري)</FormLabel><FormControl><Input placeholder="ادخل كود التفعيل" {...field} dir="ltr" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField
                                                control={whitelistForm.control}
                                                name="subscriptionDuration"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>مدة الاشتراك (بالأيام)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="30" {...field} dir="ltr" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} />
                                                        </FormControl>
                                                        <FormDescription>سيتمكن المستخدم من الوصول لميزات برو لهذه المدة.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}
                                    <Button type="submit" disabled={whitelistForm.formState.isSubmitting} className="w-full">
                                    {whitelistForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "إضافة مستخدم"}
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
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {isLoadingWhitelist ? <Skeleton className="h-10 w-full" /> : (whitelistedUsers && whitelistedUsers.length > 0) ? whitelistedUsers.map((user) => (
                                    <div key={user.id} className="flex items-center bg-secondary p-2 rounded-md">
                                        <div className="flex-1">
                                            <p className="font-bold">{user.email}</p>
                                            <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                                                <p>الصلاحية: <span className="font-semibold text-primary">{user.role}</span></p>
                                                {user.activationCode && <p>الكود: <span className="font-mono text-foreground">{user.activationCode}</span></p>}
                                                {user.subscriptionEndDate && <p>تاريخ الانتهاء: <span className="font-mono text-foreground rtl:ml-2">{safeFormatFirebaseTimestamp(user.subscriptionEndDate)}</span></p>}
                                                {user.deviceFingerprint && <p>بصمة الجهاز: <span className="font-mono text-xs text-foreground">{user.deviceFingerprint}</span></p>}
                                                <p>الحالة: {user.isActivated ? <span className="font-semibold text-green-500">مفعل</span> : <span className="font-semibold text-yellow-500">غير مفعل</span>}</p>
                                            </div>
                                        </div>
                                        {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'whitelist', entity: user })}><Trash2/></Button>}
                                    </div>
                                )) : <p className="text-muted-foreground text-center p-4">لا يوجد مستخدمون في القائمة البيضاء.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>}

                {isAdmin && <TabsContent value="settings">
                    <Accordion type="multiple" className="w-full space-y-4">
                        <AccordionItem value="payment-links" className="border-none">
                             <Card>
                                <AccordionTrigger className="p-4 font-bold text-lg hover:no-underline">إدارة روابط الدفع والتواصل</AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                    <Form {...paymentLinksForm}>
                                        <form onSubmit={paymentLinksForm.handleSubmit(onPaymentLinksSubmit)} className="space-y-6">
                                            <FormField control={paymentLinksForm.control} name="paypalUrl" render={({ field }) => ( <FormItem><FormLabel>رابط بايبال</FormLabel><FormControl><Input placeholder="https://paypal.me/..." {...field} dir="ltr" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={paymentLinksForm.control} name="whatsappUrl" render={({ field }) => ( <FormItem><FormLabel>رابط واتساب</FormLabel><FormControl><Input placeholder="https://wa.me/..." {...field} dir="ltr" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={paymentLinksForm.control} name="telegramUrl" render={({ field }) => ( <FormItem><FormLabel>رابط تلجرام</FormLabel><FormControl><Input placeholder="https://t.me/..." {...field} dir="ltr" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={paymentLinksForm.control} name="paymentInstructions" render={({ field }) => ( <FormItem><FormLabel>معلومات الدفع</FormLabel><FormControl><Textarea placeholder="اشرح للمستخدم كيفية الدفع وأين يرسل إثبات الدفع..." {...field} value={field.value ?? ''} /></FormControl><FormDescription>هذه التعليمات ستظهر للمستخدم في نافذة طلب الاشتراك.</FormDescription><FormMessage /></FormItem> )} />
                                            <Button type="submit" disabled={paymentLinksForm.formState.isSubmitting} className="w-full">{paymentLinksForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ الروابط"}</Button>
                                        </form>
                                    </Form>
                                </AccordionContent>
                             </Card>
                        </AccordionItem>

                        <AccordionItem value="theme" className="border-none">
                            <Card>
                                <AccordionTrigger className="p-4 font-bold text-lg hover:no-underline">تغيير لون الموقع</AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                     <Form {...themeForm}><form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                                        <FormField control={themeForm.control} name="primaryColor" render={({ field }) => (<FormItem><FormLabel>اللون الأساسي (الوضع الفاتح)</FormLabel><FormControl><Input placeholder="350 72% 51%" {...field} dir="ltr" /></FormControl><FormDescription>أدخل قيمة اللون بصيغة HSL بدون أقواس. مثال: 350 72% 51%</FormDescription><FormMessage /></FormItem>)} />
                                        <FormField control={themeForm.control} name="primaryColorDark" render={({ field }) => (<FormItem><FormLabel>اللون الأساسي (الوضع الليلي)</FormLabel><FormControl><Input placeholder="350 72% 51%" {...field} dir="ltr" value={field.value ?? ''}/></FormControl><FormDescription>أدخل قيمة اللون بصيغة HSL بدون أقواس. مثال: 350 72% 51%</FormDescription><FormMessage /></FormItem>)} />
                                        <Button type="submit" disabled={themeForm.formState.isSubmitting} className="w-full">{themeForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ اللون"}</Button>
                                    </form></Form>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>

                        <AccordionItem value="subscription-dialog" className="border-none">
                            <Card>
                                <AccordionTrigger className="p-4 font-bold text-lg hover:no-underline">إعدادات النافذة المنبثقة للاشتراك</AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                    <Form {...subscriptionDialogForm}><form onSubmit={subscriptionDialogForm.handleSubmit(onSubscriptionDialogSubmit)} className="space-y-6">
                                        <FormField control={subscriptionDialogForm.control} name="enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">تفعيل النافذة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                                        <FormField control={subscriptionDialogForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>عنوان النافذة</FormLabel><FormControl><Input placeholder="رفيق المصمم" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={subscriptionDialogForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>نص النافذة</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={subscriptionDialogForm.control} name="link" render={({ field }) => ( <FormItem><FormLabel>رابط الاشتراك</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                        <Button type="submit" disabled={subscriptionDialogForm.formState.isSubmitting} className="w-full">{subscriptionDialogForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ الإعدادات"}</Button>
                                    </form></Form>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                        
                        <AccordionItem value="share-link" className="border-none">
                            <Card>
                                <AccordionTrigger className="p-4 font-bold text-lg hover:no-underline">إعدادات رابط مشاركة التطبيق</AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                    <Form {...shareLinkForm}><form onSubmit={shareLinkForm.handleSubmit(onShareLinkSubmit)} className="space-y-6">
                                        <FormField control={shareLinkForm.control} name="enabled" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">تفعيل زر المشاركة</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                                        <FormField control={shareLinkForm.control} name="url" render={({ field }) => ( <FormItem><FormLabel>رابط المشاركة</FormLabel><FormControl><Input placeholder="https://..." {...field} dir="ltr" /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={shareLinkForm.control} name="text" render={({ field }) => ( <FormItem><FormLabel>نص المشاركة (اختياري)</FormLabel><FormControl><Textarea placeholder="..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                        <Button type="submit" disabled={shareLinkForm.formState.isSubmitting} className="w-full">{shareLinkForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "حفظ الإعدادات"}</Button>
                                    </form></Form>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>

                        <AccordionItem value="notifications" className="border-none">
                            <Card>
                                <AccordionTrigger className="p-4 font-bold text-lg hover:no-underline">الإشعارات</AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold mb-4">إرسال إشعار جديد</h3>
                                        <Form {...notificationForm}><form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                                            <FormField control={notificationForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>عنوان الإشعار</FormLabel><FormControl><Input placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={notificationForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>نص الإشعار</FormLabel><FormControl><Textarea placeholder="..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                            <Button type="submit" disabled={notificationForm.formState.isSubmitting} className="w-full">{notificationForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "إرسال الإشعار"}</Button>
                                        </form></Form>
                                    </div>
                                     <div>
                                        <h3 className="text-lg font-bold mb-4">الإشعارات السابقة</h3>
                                        <div className="space-y-2 max-h-72 overflow-y-auto">
                                            {isLoadingNotifications ? <Skeleton className="h-10 w-full" /> : (notifications && notifications.length > 0) ? notifications.map((notif) => (
                                                <div key={notif.id} className="flex items-center bg-secondary p-2 rounded-md">
                                                    <div className="flex-1">
                                                        <p className="font-bold">{notif.title}</p>
                                                        <p className="text-sm text-muted-foreground">{notif.description}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingEntity({ type: 'notification', entity: notif })}><Trash2/></Button>
                                                </div>
                                            )) : <p className="text-muted-foreground text-center p-4">لا توجد إشعارات سابقة.</p>}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>}
            </Tabs>
        </main>
        <AlertDialog open={!!deletingEntity} onOpenChange={(open) => !open && setDeletingEntity(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                    سيتم حذف "
                    {deletingEntity?.type === 'whitelist' 
                        ? (deletingEntity.entity as WithId<WhitelistEntry>).email 
                        : ((deletingEntity?.entity as any)?.name || (deletingEntity?.entity as any)?.title || '')
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
