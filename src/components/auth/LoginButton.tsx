'use client';

import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
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
  const { user, isUserLoading } = useUser();

  const handleSignOut = () => {
    signOut(auth);
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center p-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // User is not logged in, show a link to the admin login page.
  if (!user) {
    return (
      <Link href="/admin/login" className="block group">
        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
          <span className="font-semibold text-lg">تسجيل الدخول</span>
        </div>
      </Link>
    );
  }
  
  // If user is logged in, they must be an admin.
  // Show admin details and logout option.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="block group cursor-pointer">
          <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
            <span className="font-semibold text-lg text-primary">حساب المدير</span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Admin</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>تسجيل الخروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
