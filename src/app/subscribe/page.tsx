'use client';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import SubscriptionForm from '@/components/forms/SubscriptionForm';

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
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
