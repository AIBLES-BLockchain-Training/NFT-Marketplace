import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminRole } from './useAdminRole';

/**
 * Hook to automatically redirect admin users to dashboard
 * Use this in the main layout or pages where you want redirect behavior
 */
export function useAdminRedirect(address: string | undefined, isConnected: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, isChecking } = useAdminRole(address);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once per session if:
    // 1. Not currently checking admin status
    // 2. User is admin
    // 3. User is connected
    // 4. Not already on admin page
    // 5. Haven't redirected yet
    if (
      !isChecking &&
      isAdmin &&
      isConnected &&
      !pathname?.startsWith('/admin') &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push('/admin');
    }
  }, [isAdmin, isChecking, isConnected, pathname, router]);

  // Reset redirect flag when user leaves admin page
  useEffect(() => {
    if (!pathname?.startsWith('/admin')) {
      hasRedirected.current = false;
    }
  }, [pathname]);

  return { isAdmin, isCheckingAdmin: isChecking };
}
