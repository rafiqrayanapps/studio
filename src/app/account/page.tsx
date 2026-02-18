'use client';

import Header from '@/components/layout/Header';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, Mail, Calendar, LogOut, User } from 'lucide-react';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountPage() {
  const { user, userProfile, isPro, isLoading } = useUserProfile();
  const auth = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // If data has loaded and user is not Pro, redirect them away.
    if (!isLoading && !isPro) {
      router.replace('/home');
    }
  }, [isLoading, isPro, router]);

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

  const AccountInfoSkeleton = () => (
    <Card>
      <CardHeader className="items-center text-center">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2 pt-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-10 w-full mt-6" />
      </CardContent>
    </Card>
  );

  // While loading or if user is not pro (and redirection hasn't happened yet), show loader.
  if (isLoading || !isPro) {
    return (
      <div className="flex min-h-dvh flex-col bg-secondary">
        <Header title="حسابي" />
        <main className="flex-1 px-4 pt-4 pb-24">
          <div className="container mx-auto max-w-md">
            <AccountInfoSkeleton />
          </div>
        </main>
      </div>
    );
  }

  const subscriptionEndDate = userProfile?.subscriptionEndDate
    ? safeFormatFirebaseTimestamp(userProfile.subscriptionEndDate)
    : 'دائمة';

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <Header title="حسابي" />
      <main className="flex-1 px-4 pt-4 pb-24">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                {user?.photoURL && <AvatarImage src={user.photoURL} alt={userProfile?.displayName || user.email || ''} />}
                <AvatarFallback className="text-3xl bg-muted">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0) : (user?.email ? user.email.charAt(0).toUpperCase() : <User />)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{userProfile?.displayName || user?.email}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-yellow-500 font-semibold">
                <Crown className="h-4 w-4" />
                <span>عضوية برو</span>
              </CardDescription>
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
                    className="w-full mt-6"
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <LogOut className="ml-2 h-4 w-4" />}
                    تسجيل الخروج
                </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
