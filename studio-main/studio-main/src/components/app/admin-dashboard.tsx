'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import {
  addCategory,
  Category,
  setSubscriptionDialog,
  SubscriptionDialog as SubscriptionDialogData,
} from '@/firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import { LoaderCircle, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '../ui/textarea';

const categorySchema = z.object({
  name: z.string().min(1, 'اسم القسم مطلوب'),
});

const subCategorySchema = z.object({
  parentId: z.string().min(1, 'القسم الرئيسي مطلوب'),
  name: z.string().min(1, 'اسم القسم الفرعي مطلوب'),
});

const subscriptionDialogSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().min(1, 'الوصف مطلوب'),
  subscribeText: z.string().min(1, 'نص زر الاشتراك مطلوب'),
  cancelText: z.string().min(1, 'نص زر الإلغاء مطلوب'),
  subscribeUrl: z.string().url('رابط الاشتراك غير صالح'),
});

function SubscriptionDialogManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const dialogConfigRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'app-config', 'subscription-dialog');
  }, [firestore]);
  const { data: dialogConfig, loading: dialogLoading } =
    useDoc<SubscriptionDialogData>(dialogConfigRef);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.infer<typeof subscriptionDialogSchema>>({
    resolver: zodResolver(subscriptionDialogSchema),
    defaultValues: {
      enabled: false,
      title: '',
      description: '',
      subscribeText: 'اشتراك',
      cancelText: 'إلغاء',
      subscribeUrl: '',
    },
  });

  useEffect(() => {
    if (dialogConfig) {
      reset(dialogConfig);
    }
  }, [dialogConfig, reset]);

  const onSubmit = (data: z.infer<typeof subscriptionDialogSchema>) => {
    if (!firestore) return;
    setSubscriptionDialog(firestore, data);
    toast({ title: 'تم حفظ إعدادات نافذة الاشتراك بنجاح!' });
    reset(data); // Resets the dirty state
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة نافذة الاشتراك المنبثقة</CardTitle>
        <CardDescription>
          التحكم في النافذة التي تظهر للمستخدمين لدعوتهم للاشتراك.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">تفعيل النافذة</p>
              <p className="text-sm text-muted-foreground">
                عند تفعيلها، ستظهر النافذة للمستخدمين الجدد.
              </p>
            </div>
            <Switch
              checked={watch('enabled')}
              onCheckedChange={(checked) => setValue('enabled', checked, { shouldDirty: true })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dialogTitle">العنوان</Label>
            <Input id="dialogTitle" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dialogDescription">الوصف</Label>
            <Textarea id="dialogDescription" {...register('description')} />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="dialogSubscribeText">نص زر الاشتراك</Label>
                <Input id="dialogSubscribeText" {...register('subscribeText')} />
                {errors.subscribeText && (
                <p className="text-sm text-destructive">
                    {errors.subscribeText.message}
                </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="dialogCancelText">نص زر الإلغاء</Label>
                <Input id="dialogCancelText" {...register('cancelText')} />
                {errors.cancelText && (
                <p className="text-sm text-destructive">
                    {errors.cancelText.message}
                </p>
                )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dialogSubscribeUrl">رابط الاشتراك</Label>
            <Input id="dialogSubscribeUrl" {...register('subscribeUrl')} placeholder="https://t.me/your-channel" />
            {errors.subscribeUrl && (
              <p className="text-sm text-destructive">
                {errors.subscribeUrl.message}
              </p>
            )}
          </div>


          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
            حفظ التغييرات
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'categories');
  }, [firestore]);
  const { data: categories, loading: categoriesLoading } =
    useCollection<Category>(categoriesQuery);

  const mainCategories = useMemo(
    () => categories?.filter((c) => !c.parentId) || [],
    [categories]
  );

  const {
    register: registerCategory,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    formState: { errors: categoryErrors },
  } = useForm({
    resolver: zodResolver(categorySchema),
  });

  const {
    register: registerSubCategory,
    handleSubmit: handleSubCategorySubmit,
    reset: resetSubCategory,
    setValue: setSubCategoryValue,
    formState: { errors: subCategoryErrors },
  } = useForm({
    resolver: zodResolver(subCategorySchema),
  });

  useEffect(() => {
    registerSubCategory('parentId');
  }, [registerSubCategory]);

  const onAddCategory = (data: z.infer<typeof categorySchema>) => {
    if (!firestore) return;
    addCategory(firestore, { name: data.name, parentId: null });
    toast({ title: 'تمت إضافة القسم بنجاح' });
    resetCategory();
  };

  const onAddSubCategory = (data: z.infer<typeof subCategorySchema>) => {
    if (!firestore) return;
    addCategory(firestore, { name: data.name, parentId: data.parentId });
    toast({ title: 'تمت إضافة القسم الفرعي بنجاح' });
    resetSubCategory();
  };

  return (
    <div className="container mx-auto grid gap-8 px-4 py-8">
      <h1 className="text-3xl font-bold">لوحة التحكم</h1>

      <SubscriptionDialogManager />

      <Card>
        <CardHeader>
          <CardTitle>إضافة قسم رئيسي</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCategorySubmit(onAddCategory)}
            className="flex flex-col gap-4"
          >
            <div>
              <Label htmlFor="categoryName">اسم القسم</Label>
              <Input id="categoryName" {...registerCategory('name')} />
              {categoryErrors.name && (
                <p className="mt-1 text-sm text-destructive">
                  {categoryErrors.name.message as string}
                </p>
              )}
            </div>
            <Button type="submit">إضافة قسم</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إضافة قسم داخل قسم</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubCategorySubmit(onAddSubCategory)}
            className="flex flex-col gap-4"
          >
            <div>
              <Label>اختر القسم الرئيسي</Label>
              <Select
                onValueChange={(value) => setSubCategoryValue('parentId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر قسمًا رئيسيًا" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="loading" disabled>
                      جار تحميل الأقسام...
                    </SelectItem>
                  ) : (
                    mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {subCategoryErrors.parentId && (
                <p className="mt-1 text-sm text-destructive">
                  {subCategoryErrors.parentId.message as string}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="subCategoryName">اسم القسم الفرعي</Label>
              <Input
                id="subCategoryName"
                {...registerSubCategory('name')}
              />
              {subCategoryErrors.name && (
                <p className="mt-1 text-sm text-destructive">
                  {subCategoryErrors.name.message as string}
                </p>
              )}
            </div>
            <Button type="submit">إضافة قسم فرعي</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
