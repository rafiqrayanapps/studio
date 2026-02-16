'use client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

const AppLogo = () => {
    return (
        <div className="bg-card p-8 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center w-full leading-tight">
            <div className="font-bold text-5xl flex flex-col items-center gap-2">
                <span className="text-foreground">رفيق</span>
                <span className="bg-muted text-primary rounded-2xl px-6 py-2">المصمم</span>
            </div>
        </div>
    );
};


export default function AboutPage() {

    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            {/* The header provides the purple curved background */}
            <Header title="حول التطبيق" />

            {/* This container sits on top of the header's curve */}
            <div className="flex-1 flex flex-col -mt-24 z-10 px-6 pb-24">
                
                {/* Main content area that takes up available space */}
                <main className="flex-1 text-center pt-8">
                    <div className="max-w-md mx-auto">
                        {/* Logo */}
                        <div className="mb-8">
                           <AppLogo />
                        </div>

                        {/* App Info */}
                        <p className="text-lg text-muted-foreground mt-4">صنع من ❤️ لكم</p>

                        <div className="mt-12 text-muted-foreground space-y-1 text-sm">
                            <p>الإصدار 1.0.0</p>
                            <p>جميع الحقوق محفوظة © 2026</p>
                        </div>
                    </div>
                </main>
                
                {/* Footer with the support button, pushed to the bottom */}
                <footer className="mt-8">
                    <div className="max-w-md mx-auto">
                        <Button asChild size="lg" className="w-full h-14 rounded-full text-lg font-bold">
                            <a href="https://www.paypal.me/RyanSalah7" target="_blank" rel="noopener noreferrer">
                                ادعم التطبيق
                            </a>
                        </Button>
                    </div>
                </footer>
            </div>

        </div>
    );
}
