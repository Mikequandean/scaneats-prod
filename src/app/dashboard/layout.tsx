import { BottomNav } from '@/components/bottom-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen pb-28">
      {children}
      <BottomNav />
    </div>
  );
}
