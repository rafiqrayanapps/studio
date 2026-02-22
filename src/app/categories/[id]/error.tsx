'use client'

import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert, Hammer, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/Header'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
        <Header showMenu={false} title="تنبيه تقني">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-7 w-7" /></Button>
        </Header>
        
        <main className="flex-1 flex items-center justify-center px-6 pb-24 -mt-16">
            <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Decorative background blur */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
                
                <Card className="relative overflow-hidden rounded-[3rem] border-none shadow-2xl bg-card p-8 text-center space-y-8">
                    {/* Animated Icon Scene */}
                    <div className="relative h-32 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center opacity-5">
                            <AlertTriangle className="h-24 w-24 text-destructive animate-pulse" />
                        </div>
                        <div className="relative">
                            <div className="bg-destructive/10 p-6 rounded-[2rem] relative">
                                <Settings className="h-12 w-12 text-destructive animate-spin-slow" />
                                <ShieldAlert className="h-6 w-6 text-destructive absolute -bottom-1 -right-1" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-black text-foreground">عفواً، حدث خلل بسيط</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed px-4 font-medium">
                            يبدو أننا نواجه صعوبة في تحميل محتوى هذا القسم حالياً. قد يكون السبب تحديثاً جارياً أو مشكلة مؤقتة في الاتصال.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={() => reset()}
                            size="lg"
                            className="h-14 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <RefreshCw className="ml-2 h-5 w-5" />
                            محاولة التحديث
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/home')}
                            className="h-12 rounded-xl text-muted-foreground font-bold hover:bg-secondary"
                        >
                            العودة للرئيسية
                        </Button>
                    </div>
                </Card>
            </div>
        </main>
    </div>
  )
}