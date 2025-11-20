import { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminRole } from '../../hooks/useAdminRole';
import { useWallet } from '../../hooks/useWallet';
import { Spinner } from '../common/Spinner';
import toast from 'react-hot-toast';

interface RoleProtectedProps {
  children: ReactNode;
}

export function RoleProtected({ children }: RoleProtectedProps) {
  const router = useRouter();
  const { address } = useWallet();
  const { isAdmin, isChecking } = useAdminRole(address || undefined);
  const hasShownError = useRef(false);

  useEffect(() => {
    if (!isChecking && !hasShownError.current) {
      if (!address) {
        hasShownError.current = true;
        toast.error('Please connect your wallet');
        router.push('/');
      } else if (!isAdmin) {
        hasShownError.current = true;
        toast.error('Access denied: Admin privileges required');
        router.push('/');
      }
    }
  }, [address, isAdmin, isChecking, router]);

  if (isChecking) {
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
