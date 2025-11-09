import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getBrowserProvider } from '../lib/web3/provider';
import { PERMISSIONS_ADDRESS } from '../lib/contracts/addresses';

// ABI for checking role
const PERMISSIONS_ABI = [
  'function MANAGEMENT_ROLE() public pure returns (bytes32)',
  'function hasRole(bytes32 role, address account) public view returns (bool)'
];

export function useAdminRole(address: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!address) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);

        const provider = getBrowserProvider();
        if (!provider) {
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        // Create contract instance using Permissions contract address
        const contract = new ethers.Contract(PERMISSIONS_ADDRESS, PERMISSIONS_ABI, provider);

        // Get MANAGEMENT_ROLE hash
        const managementRole = await contract.MANAGEMENT_ROLE();

        // Check if address has MANAGEMENT_ROLE
        const hasRole = await contract.hasRole(managementRole, address);

        setIsAdmin(hasRole);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkAdminRole();
  }, [address]);

  return { isAdmin, isChecking };
}
