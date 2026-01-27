import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

const PageLoader = ({ message = 'Carregando...' }: PageLoaderProps) => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export { PageLoader };
