import UnifiedLoginForm from '@/components/auth/UnifiedLoginForm';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-secondary p-4">
        <div className="w-full max-w-md">
            <Card>
                <UnifiedLoginForm />
            </Card>
        </div>
    </div>
  );
}
