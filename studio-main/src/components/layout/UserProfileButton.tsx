'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import { Crown, Loader2, LogOut, Shield, User as UserIcon, Key, ChevronLeft, LayoutDashboard, Coins } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

    // Role-based links for Admins/Editors
    const showDashboardLink = isAdmin || isEditor;

    if (user && !user.isAnonymous) {
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
                            <p className="text-[10px] text-muted-foreground">
                                {isPro ? 'عضوية برو نشطة' : 'عضوية عادية'}
                            </p>
                        </div>
                    </div>
                </li>
                
                {showDashboardLink && (
                    <li>
                        <SheetClose asChild>
                            <Link href="/admin/dashboard" className="block group">
                                <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                    <div className="flex items-center gap-2">
                                        <LayoutDashboard className="h-5 w-5 text-primary" />
                                        <span className="font-semibold text-lg">لوحة التحكم</span>
                                    </div>
                                    <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </Link>
                        </SheetClose>
                    </li>
                )}

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
                        <Link href="/login?tab=convert" className="block group">
                            <div className="flex items-center justify-between p-3 rounded-lg group-hover:bg-secondary">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">تحويل النقاط</span>
                                    <Coins className="h-4 w-4 text-primary" />
                                </div>
                                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
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
