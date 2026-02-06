import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

const OfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>Você está offline. Algumas funcionalidades podem estar limitadas.</span>
    </div>
  );
};

export default OfflineIndicator;
