'use client';

import Header from '@/components/layout/Header';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, Mail, Calendar, LogOut, User, Copy, Users, Gift, CheckCircle2 } from 'lucide-react';
import { useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { ReferralConfig } from '@/lib/definitions';

export default function AccountPage() {
  const { user, userProfile, isPro, isLoading } = useUserProfile();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const referralConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'referral') : null, [firestore]);
  const { data: refConfig } = useDoc<ReferralConfig>(referralConfigRef);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/home');
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
        await auth.signOut();
        router.push('/home');
    } catch (error) {
        console.error('Logout error:', error);
        setIsLoggingOut(false);
    }
  };

  const copyReferralCode = () => {
      if (userProfile?.referralCode) {
          navigator.clipboard.writeText(userProfile.referralCode);
          toast({ title: "تم نسخ كود الإحالة" });
      }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh flex-col bg-secondary">
        <Header title="حسابي" />
        <main className="flex-1 px-4 pt-4 pb-24">
          <div className="container mx-auto max-w-md">
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  const subscriptionEndDate = userProfile?.subscriptionEndDate
    ? safeFormatFirebaseTimestamp(userProfile.subscriptionEndDate)
    : 'دائمة';

  const required = refConfig?.requiredReferrals || 5;
  const progress = Math.min(((userProfile?.referralCount || 0) / required) * 100, 100);

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="حسابي" />
      <main className="flex-1 px-4 pt-4 pb-24">
        <div className="container mx-auto max-w-md space-y-6">
          <Card>
            <CardHeader className="items-center text-center pb-2">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={userProfile?.displayName || user.email || ''} />}
                <AvatarFallback className="text-3xl bg-muted">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0) : (user?.email ? user.email.charAt(0).toUpperCase() : <User />)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{userProfile?.displayName || user?.email}</CardTitle>
              {isPro && (
                  <CardDescription className="flex items-center gap-1 text-yellow-500 font-semibold">
                    <Crown className="h-4 w-4" />
                    <span>عضوية برو</span>
                  </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</p>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm">
                        <Mail className="h-5 w-5 text-primary" />
                        <span className="font-mono">{user?.email}</span>
                    </div>
                </div>
                 <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">صلاحية الاشتراك</p>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span>
                            ينتهي في: <strong>{subscriptionEndDate}</strong>
                        </span>
                    </div>
                </div>

                <Button 
                    onClick={handleLogout} 
                    variant="outline" 
                    className="w-full mt-2"
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <LogOut className="ml-2 h-4 w-4" />}
                    تسجيل الخروج
                </Button>
            </CardContent>
          </Card>

          {/* Referral System Section */}
          <Card className="overflow-hidden border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      نظام الإحالة والمكافآت
                  </CardTitle>
                  <CardDescription>ادعُ أصدقاءك واحصل على مميزات برو مجانية!</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                  <div className="bg-muted p-4 rounded-xl space-y-2">
                      <p className="text-sm font-bold">كود الإحالة الخاص بك:</p>
                      <div className="flex gap-2">
                          <div className="flex-1 bg-background border rounded-lg p-3 text-center font-mono text-xl font-bold tracking-widest text-primary">
                              {userProfile?.referralCode}
                          </div>
                          <Button size="icon" variant="secondary" onClick={copyReferralCode}>
                              <Copy className="h-5 w-5" />
                          </Button>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <div className="flex justify-between items-end">
                          <p className="text-sm font-medium">التقدم نحو المكافأة القادمة:</p>
                          <p className="text-xs text-primary font-bold">{userProfile?.referralCount || 0} / {required} إحالة</p>
                      </div>
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${progress}%` }}
                          />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">باقي {Math.max(required - (userProfile?.referralCount || 0), 0)} إحالة للحصول على ميزة برو أو كود جديد.</p>
                  </div>

                  {userProfile?.unlockedProCodes && userProfile.unlockedProCodes.length > 0 && (
                      <div className="space-y-3 pt-2">
                          <p className="text-sm font-bold flex items-center gap-2"><Gift className="h-4 w-4 text-green-500" /> الأكواد التي فتحتها:</p>
                          <div className="grid grid-cols-1 gap-2">
                              {userProfile.unlockedProCodes.map((code, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded-lg text-sm">
                                      <span className="font-mono font-bold text-green-700">{code}</span>
                                      <Button variant="ghost" size="sm" className="h-8" onClick={() => {
                                          navigator.clipboard.writeText(code);
                                          toast({ title: "تم نسخ الكود" });
                                      }}>نسخ</Button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
