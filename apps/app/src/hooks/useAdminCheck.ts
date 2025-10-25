import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';
import { graphqlClient } from '../lib/graphql/client';
import { GET_USER_ROLE_ASSIGNMENTS_QUERY } from '../lib/graphql/queries';

export function useAdminCheck() {
  const { address } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!address) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await graphqlClient.query(GET_USER_ROLE_ASSIGNMENTS_QUERY, {
          address: address.toLowerCase(),
        });

        if (result.error) {
          console.error('Error checking admin role:', result.error);
          setIsAdmin(false);
          return;
        }

        const hasManagementRole = result.data?.roleAssignments?.some(
          (assignment: any) => assignment.role.roleName === 'MANAGEMENT_ROLE'
        );

        setIsAdmin(hasManagementRole || false);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminRole();
  }, [address]);

  return { isAdmin, isLoading };
}
