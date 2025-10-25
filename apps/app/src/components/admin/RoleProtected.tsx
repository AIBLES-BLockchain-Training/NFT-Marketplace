import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminCheck } from '../../hooks/useAdminCheck';
import { useWallet } from '../../hooks/useWallet';
import { Spinner } from '../common/Spinner';
import toast from 'react-hot-toast';

interface RoleProtectedProps {
  children: ReactNode;
}

export function RoleProtected({ children }: RoleProtectedProps) {
  const router = useRouter();
  const { address } = useWallet();
  const { isAdmin, isLoading } = useAdminCheck();

  useEffect(() => {
    if (!isLoading) {
      if (!address) {
        toast.error('Please connect your wallet');
        router.push('/');
      } else if (!isAdmin) {
        toast.error('Access denied: Admin privileges required');
        router.push('/');
      }
    }
  }, [address, isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!address || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
