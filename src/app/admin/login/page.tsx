import AdminLoginForm from '@/components/auth/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-primary overflow-hidden">
        <div className="w-full max-w-xs px-4 z-10 space-y-10">
            <div className="text-center text-primary-foreground">
                <h1 className="text-5xl font-bold">تسجيل الدخول</h1>
                <p className="text-lg opacity-90">للمتابعة</p>
            </div>
            <AdminLoginForm />
        </div>
       <div className="absolute bottom-0 left-0 right-0 animate-wave">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 220">
            <path fill="hsl(var(--background))" fillOpacity="1" d="M0,128L48,138.7C96,149,192,171,288,170.7C384,171,480,149,576,128C672,107,768,85,864,96C960,107,1056,149,1152,160C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
      </div>
    </div>
  );
}
