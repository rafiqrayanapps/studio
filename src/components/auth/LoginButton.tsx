'use client';

import {
  useAuth,
  useFirestore,
  useUser,
  useDoc,
  useMemoFirebase,
  WithId
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { signInWithGoogle } from '@/firebase/auth-actions';
import type { UserProfile } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, LogOut } from 'lucide-react';

export default function LoginButton() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const handleGoogleSignIn = () => {
    signInWithGoogle(auth, firestore);
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="flex items-center justify-center p-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="block group cursor-pointer" onClick={handleGoogleSignIn}>
        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
          <span className="font-semibold text-lg">تسجيل الدخول بجوجل</span>
        </div>
      </div>
    );
  }
  
  if (userProfile?.subscriptionTier === 'pro') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="block group cursor-pointer">
            <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
              <span className="font-semibold text-lg text-green-500">حساب برو نشط ✅</span>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userProfile.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userProfile.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            تاريخ الانتهاء: ٣١/١٢/٢٠٢٦
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default to free user if profile exists
  return (
     <Link href="/pricing" className="block group">
        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
          <span className="font-semibold text-lg text-yellow-500">الترقية للبرو 👑</span>
        </div>
     </Link>
  );
}
