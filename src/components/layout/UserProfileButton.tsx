'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import { Crown, Loader2, LogOut, Shield, User as UserIcon, Key, ChevronLeft, LayoutDashboard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { safeFormatFirebaseTimestamp } from '@/lib/date-utils';
import { useRouter } from 'next/navigation';

export default function UserProfileButton() {
    const { user, userProfile, isPro, isAdmin, isEditor, isLoading } = useUserProfile();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            router.push('/home');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (isLoading) {
        return (
            <li>
                <div className="flex items-center justify-center p-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            </li>
        );
    }

    // Handle Admin and Editor roles
    if (isAdmin || isEditor) {
        const roleLabel = isAdmin ? "حساب المدير" : "حساب المحرر";
        return (
             <li>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between h-auto p-3 hover:bg-secondary">
                            <span className="font-semibold text-lg">{roleLabel}</span>
                             <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <Link href="/admin/dashboard">
                            <DropdownMenuItem className="cursor-pointer">
                                <LayoutDashboard className="ml-2 h-4 w-4" />
                                <span>لوحة التحكم</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                            <LogOut className="ml-2 h-4 w-4" />
                            <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </li>
        )
    }

    // Handle regular Pro users
    if (isPro) {
        const subscriptionEndDate = userProfile?.subscriptionEndDate
            ? safeFormatFirebaseTimestamp(userProfile.subscriptionEndDate)
            : 'دائمة';

        return (
            <>
                <li className="px-3 pt-4 mt-2 border-t">
                    <div className="flex items-center gap-3">
                         <Avatar className="h-10 w-10 border-2 border-primary">
                            {user?.photoURL && <AvatarImage src={user.photoURL} alt={userProfile?.displayName || ''} />}
                            <AvatarFallback className="bg-muted text-lg">
                                {userProfile?.displayName ? userProfile.displayName.charAt(0) : (user?.email ? user.email.charAt(0).toUpperCase() : <UserIcon />)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold text-sm truncate">{userProfile?.displayName || user?.email}</p>
                            <p className="text-xs text-muted-foreground">
                                الاشتراك ينتهي: <strong>{subscriptionEndDate}</strong>
                            </p>
                        </div>
                    </div>
                </li>
                <li>
                    <SheetClose asChild>
                        <Link href="/account" className="block group">
                            <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                <span className="font-semibold text-lg">إدارة الحساب</span>
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </Link>
                    </SheetClose>
                </li>
                <li>
                    <SheetClose asChild>
                        <button 
                            className="w-full block group cursor-pointer" 
                            onClick={handleLogout}
                        >
                            <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                <span className="font-semibold text-lg text-destructive">تسجيل الخروج</span>
                                <LogOut className="h-5 w-5 text-destructive" />
                            </div>
                        </button>
                    </SheetClose>
                </li>
            </>
        );
    }
    
    // Free user or visitor
    return (
        <>
            <li>
                <SheetClose asChild>
                    <Link href="/pricing" className="block group">
                        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                            <span className="font-semibold text-lg">الاشتراك</span>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                </SheetClose>
            </li>
            <li>
                <SheetClose asChild>
                    <Link href="/login" className="block group">
                        <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                            <span className="font-semibold text-lg">تسجيل الدخول</span>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </Link>
                </SheetClose>
            </li>
        </>
    );
}
