import { AdminDashboard } from '@/components/app/admin-dashboard';
import { AdminAuthGuard } from '@/components/app/admin-auth-guard';

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AdminDashboard />
    </AdminAuthGuard>
  );
}
