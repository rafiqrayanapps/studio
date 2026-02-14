'use client';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

export default function SubscribePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="اشتراك" />
      <main className="flex-1 px-4 pt-4 pb-24">
        <div className="container mx-auto max-w-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">انضم إلينا</h2>
            <p className="text-muted-foreground mt-2">
              املأ النموذج أدناه وسنتواصل معك قريبًا.
            </p>
          </div>
          <SubscriptionForm />
          <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-secondary px-2 text-muted-foreground">
                      أو
                  </span>
              </div>
          </div>
          <Button asChild variant="outline" className="w-full border-green-500 text-green-600 bg-green-50/50 hover:bg-green-100 hover:text-green-700 h-12 text-base">
            <a href="https://wa.me/966000000000" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="ml-2 h-5 w-5" />
                تواصل معنا عبر واتساب
            </a>
          </Button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
