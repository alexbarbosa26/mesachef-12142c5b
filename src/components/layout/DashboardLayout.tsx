import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' && localStorage.getItem('sidebar-collapsed') === '1'
  );
  useEffect(() => {
    const handler = () => setCollapsed(localStorage.getItem('sidebar-collapsed') === '1');
    window.addEventListener('sidebar-collapsed-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('sidebar-collapsed-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* Add padding-top for mobile header (h-14 = 3.5rem) */}
      <main className={`${collapsed ? 'lg:ml-16' : 'lg:ml-64'} transition-[margin] duration-300 ease-out min-h-screen p-4 lg:p-8 pt-[4.5rem] lg:pt-8`}>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;