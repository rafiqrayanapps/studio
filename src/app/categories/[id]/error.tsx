'use client'

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/Header'
import { useRouter } from 'next/navigation'

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col bg-secondary" dir="rtl">
        <Header showMenu={false} title="حدث خطأ">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
        </Header>
        <main className="flex-1 flex items-center justify-center px-6 pb-24 -mt-12">
            <div className="bg-card p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="text-2xl font-bold text-foreground">قسم قيد الصيانة</h2>
                <p className="text-muted-foreground">
                عفواً، يبدو أن هذا القسم يخضع للصيانة حاليًا أو أن هناك مشكلة في تحميل المحتوى. الرجاء المحاولة مرة أخرى لاحقًا.
                </p>
                <Button
                onClick={() => reset()}
                className="mt-4"
                >
                <RefreshCw className="ml-2 h-4 w-4" />
                محاولة التحديث
                </Button>
            </div>
        </main>
    </div>
  )
}
