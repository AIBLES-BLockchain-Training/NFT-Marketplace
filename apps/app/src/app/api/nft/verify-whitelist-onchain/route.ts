import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { PERMISSIONS_ADDRESS } from '../../../../lib/contracts/addresses';

const PERMISSIONS_ABI = [
  'function NFT_ROLE() public pure returns (bytes32)',
  'function hasRole(bytes32 role, address account) public view returns (bool)',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collectionAddress } = body;

    if (!collectionAddress) {
      return NextResponse.json(
        { success: false, error: 'Collection address is required' },
        { status: 400 }
      );
    }

    const normalizedAddress = collectionAddress.toLowerCase();

    console.log('Verifying NFT whitelist ON-CHAIN for:', normalizedAddress);

    // Connect to Sepolia RPC
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.org'
    );

    const permissionsContract = new ethers.Contract(
      PERMISSIONS_ADDRESS,
      PERMISSIONS_ABI,
      provider
    );

    // Get NFT_ROLE hash
    const nftRole = await permissionsContract.NFT_ROLE();
    console.log('NFT_ROLE hash:', nftRole);

    // Check if collection has the role
    const hasRole = await permissionsContract.hasRole(nftRole, normalizedAddress);

    console.log('Has NFT_ROLE on-chain:', hasRole);

    return NextResponse.json({
      success: true,
      data: {
        collectionAddress: normalizedAddress,
        hasRoleOnChain: hasRole,
        nftRoleHash: nftRole,
        permissionsContract: PERMISSIONS_ADDRESS,
      },
    });
  } catch (error: any) {
    console.error('Error verifying on-chain whitelist:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify on-chain whitelist',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
