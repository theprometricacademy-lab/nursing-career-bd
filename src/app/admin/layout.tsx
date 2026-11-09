import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import { AdminShell } from './AdminShell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/');
  return <AdminShell>{children}</AdminShell>;
}
