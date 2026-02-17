'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getDocs, query, where, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Key, CheckCircle, ShieldAlert, Eye, EyeOff, User, Mail, ShieldCheck, Signature } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FirebaseError } from 'firebase/app';
import type { WhitelistEntry } from '@/lib/definitions';
import { getDeviceFingerprint } from '@/lib/fingerprint';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { Suspense } from 'react';

// Schemas
const codeSchema = z.object({ code: z.string().min(1, 'الرجاء إدخال كود التفعيل.') });
const contractSchema = z.object({
  fullName: z.string().min(3, 'الاسم الكامل مطلوب.'),
  paypalEmail: z.string().email('بريد PayPal غير صالح.'),
  email: z.string().email(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, { message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"] });

type CodeValues = z.infer<typeof codeSchema>;
type ContractValues = z.infer<typeof contractSchema>;

type Step = 'code' | 'contract' | 'success' | 'error';

function ActivationForm() {
  const [step, setStep] = useState<Step>('code');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activationData, setActivationData] = useState<{
    whitelistEntry: WhitelistEntry & { id: string };
    fingerprint: string;
    code: string;
  } | null>(null);

  const sigCanvas = useRef<SignatureCanvas>(null);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });
  const contractForm = useForm<ContractValues>({ resolver: zodResolver(contractSchema) });

  useEffect(() => {
    const codeFromURL = searchParams.get('code');
    if (codeFromURL) {
      codeForm.setValue('code', codeFromURL);
      codeForm.handleSubmit(onCodeSubmit)();
    }
  }, [searchParams]);

  const onCodeSubmit = async (data: CodeValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!firestore) throw new Error("خدمة قاعدة البيانات غير متاحة");
      
      const currentFingerprint = await getDeviceFingerprint();
      const q = query(collection(firestore, 'whitelist'), where("activationCode", "==", data.code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("كود التفعيل غير صالح.");
      
      const whitelistDoc = querySnapshot.docs[0];
      const entry = whitelistDoc.data() as WhitelistEntry;

      if (entry.isActivated) {
          const fingerprints = entry.deviceFingerprints || [];
          if(fingerprints.includes(currentFingerprint)) {
              throw new Error("هذا الكود تم استخدامه وتفعيله بالفعل على هذا الجهاز.");
          } else {
              throw new Error("عذراً، هذا الكود مستخدم على جهاز آخر.");
          }
      }
      
      setActivationData({ whitelistEntry: { ...entry, id: whitelistDoc.id }, fingerprint: currentFingerprint, code: data.code });
      contractForm.setValue('email', whitelistDoc.id);
      setStep('contract');
    } catch (e: any) {
      setStep('error');
      setError(e.message || "فشل التحقق من الكود.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onContractSubmit = async (data: ContractValues) => {
    setIsSubmitting(true);
    setError(null);
    if (sigCanvas.current?.isEmpty()) {
        setError("التوقيع مطلوب.");
        setIsSubmitting(false);
        return;
    }

    try {
      if (!firestore || !activationData) throw new Error("فقدت بيانات التفعيل. يرجى المحاولة مرة أخرى.");
      if (data.email !== activationData.whitelistEntry.id) throw new Error("البريد الإلكتروني لا يتطابق مع البريد المرتبط بالكود.");

      // 1. Generate PDF
      const sigDataUrl = sigCanvas.current!.getTrimmedCanvas().toDataURL('image/png');
      const pdf = new jsPDF();
      const date = new Date().toLocaleString();
      
      pdf.text("Activation Contract", 10, 10);
      pdf.text(`Date: ${date}`, 10, 20);
      pdf.text(`Device ID: ${activationData.fingerprint}`, 10, 30);
      pdf.text(`Full Name: ${data.fullName}`, 10, 40);
      pdf.text(`PayPal Email: ${data.paypalEmail}`, 10, 50);
      
      const contractTextEn = `I, ${data.fullName}, holder of PayPal email ${data.paypalEmail}, hereby acknowledge the activation of PRO features on device ID ${activationData.fingerprint}. I confirm that I have received the digital service in full. I agree that this transaction is final and non-refundable, waiving my right to any PayPal dispute.`;
      const contractTextAr = `أنا ${data.fullName}، صاحب بريد بيبال ${data.paypalEmail}، أقر بتفعيل مميزات البرو على الجهاز ذو المعرف ${activationData.fingerprint}. أؤكد أنني استلمت الخدمة الرقمية كاملة، وأوافق على أن هذه العملية نهائية وغير قابلة للاسترداد، متنازلاً عن حقي في فتح أي نزاع عبر بيبال.`;

      pdf.text(contractTextEn, 10, 60, { maxWidth: 190 });
      pdf.text(contractTextAr, 10, 100, { maxWidth: 190, align: 'right', lang: 'ar' });
      
      pdf.text("Signature:", 10, 140);
      pdf.addImage(sigDataUrl, 'PNG', 10, 150, 80, 40);
      
      const pdfAsString = pdf.output('datauristring');

      // 2. Upload PDF to Storage
      const storage = getStorage();
      const storageRef = ref(storage, `contracts/${activationData.fingerprint}/${Date.now()}.pdf`);
      const snapshot = await uploadString(storageRef, pdfAsString, 'data_url');
      const pdfDownloadUrl = await getDownloadURL(snapshot.ref);

      // 3. Create user and update databases
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const batch = writeBatch(firestore);
      const whitelistRef = doc(firestore, 'whitelist', activationData.whitelistEntry.id);
      batch.update(whitelistRef, {
        isActivated: true,
        activatedByUid: user.uid,
        deviceFingerprints: [activationData.fingerprint],
      });

      const userProfileRef = doc(firestore, 'users', user.uid);
      batch.set(userProfileRef, {
        email: data.email,
        displayName: data.fullName,
        subscriptionTier: 'pro',
        createdAt: serverTimestamp(),
        subscriptionEndDate: activationData.whitelistEntry.subscriptionEndDate || null,
        contractPdfUrl: pdfDownloadUrl,
      });

      await batch.commit();

      setSuccessMessage('تم تفعيل حسابك بنجاح! سيتم توجيهك الآن...');
      setStep('success');
      setTimeout(() => router.push('/home'), 3000);

    } catch (e: any) {
      if (e instanceof FirebaseError && e.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مستخدم بالفعل.');
      } else {
        setError(e.message || "فشل إنشاء الحساب.");
      }
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStep = () => {
    switch(step) {
      case 'code':
        return (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>تفعيل اشتراك برو</CardTitle>
              <CardDescription>أدخل كود التفعيل الذي حصلت عليه للمتابعة</CardDescription>
            </CardHeader>
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)}>
                <CardContent><FormField control={codeForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>كود التفعيل</FormLabel><FormControl><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)}/></CardContent>
                <CardFooter><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'تحقق من الكود'}</Button></CardFooter>
              </form>
            </Form>
          </Card>
        );
      case 'contract':
        return (
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <CardTitle>العقد الإلكتروني وتفعيل الحساب</CardTitle>
              <CardDescription>الخطوة الأخيرة! يرجى قراءة العقد وتوقيعه، ثم إنشاء حسابك.</CardDescription>
            </CardHeader>
            <Form {...contractForm}>
              <form onSubmit={contractForm.handleSubmit(onContractSubmit)}>
                <CardContent className="space-y-4">
                  <div className="border bg-secondary text-secondary-foreground p-3 rounded-md text-xs h-32 overflow-y-auto space-y-2">
                      <p dir="ltr">I, [Your Name], holder of PayPal email [Your PayPal Email], hereby acknowledge the activation of PRO features on device ID [{activationData?.fingerprint}]. I confirm that I have received the digital service in full. I agree that this transaction is final and non-refundable, waiving my right to any PayPal dispute.</p>
                      <p dir="rtl">أنا [اسمك]، صاحب بريد بيبال [بريدك في بيبال]، أقر بتفعيل مميزات البرو على الجهاز ذو المعرف [{activationData?.fingerprint}]. أؤكد أنني استلمت الخدمة الرقمية كاملة، وأوافق على أن هذه العملية نهائية وغير قابلة للاسترداد، متنازلاً عن حقي في فتح أي نزاع عبر بيبال.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={contractForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>الاسم الكامل (كما في العقد)</FormLabel><FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={contractForm.control} name="paypalEmail" render={({ field }) => (<FormItem><FormLabel>بريد PayPal (كما في العقد)</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                  </div>
                   <div className="space-y-2">
                        <FormLabel>التوقيع الإلكتروني</FormLabel>
                        <div className="border rounded-md bg-background"><SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{className: 'w-full h-[150px]'}} /></div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()}>مسح التوقيع</Button>
                    </div>
                  <FormField control={contractForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>بريد التسجيل</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input {...field} className="pl-10 text-left" dir="ltr" readOnly disabled /></div></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={contractForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><div className="relative"><EyeOff className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={contractForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>تأكيد كلمة المرور</FormLabel><FormControl><div className="relative"><ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="password" {...field} className="pl-10 text-left" dir="ltr" /></div></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </CardContent>
                <CardFooter><Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'توقيع وتفعيل النسخة المدفوعة'}</Button></CardFooter>
              </form>
            </Form>
          </Card>
        );
      case 'success':
        return (
          <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">تم التفعيل بنجاح!</h2>
            <p className="text-muted-foreground">{successMessage}</p>
          </CardContent></Card>
        );
       case 'error':
        return (
           <Card><CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
            <ShieldAlert className="h-16 w-16 text-destructive" />
            <h2 className="text-2xl font-bold">حدث خطأ</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => setStep('code')}>المحاولة مرة أخرى</Button>
          </CardContent></Card>
        );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
        {renderStep()}
    </div>
  );
}

export default function ActivatePage() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
            <Suspense fallback={<Card className="w-full max-w-md h-96"><CardContent className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>}>
                <ActivationForm />
            </Suspense>
        </div>
    );
}
