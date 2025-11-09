import { NextRequest, NextResponse } from 'next/server';
import { graphqlClient } from '../../../../lib/graphql/client';
import { ethers } from 'ethers';

const CHECK_NFT_WHITELIST_QUERY = `
  query CheckNFTWhitelist($collectionAddress: String!) {
    nftRoleRequests(where: { nftAddress_eq: $collectionAddress, status_eq: APPROVED }, limit: 1) {
      id
      nftAddress
      status
    }
  }
`;

const PERMISSIONS_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function NFT_ROLE() view returns (bytes32)',
];

const PERMISSIONS_ADDRESS = process.env.NEXT_PUBLIC_PERMISSIONS_CONTRACT;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'http://localhost:8545';

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

    console.log('Checking NFT whitelist for:', normalizedAddress);
    console.log('RPC_URL:', RPC_URL);
    console.log('PERMISSIONS_ADDRESS:', PERMISSIONS_ADDRESS);

    // Step 1: Check if address(0) has NFT_ROLE (global whitelist)
    try {
      if (!PERMISSIONS_ADDRESS) {
        console.error('PERMISSIONS_ADDRESS is not configured');
        throw new Error('PERMISSIONS_ADDRESS not configured');
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const permissionsContract = new ethers.Contract(
        PERMISSIONS_ADDRESS,
        PERMISSIONS_ABI,
        provider
      );

      console.log('Calling NFT_ROLE()...');
      const nftRole = await permissionsContract.NFT_ROLE();
      console.log('NFT_ROLE:', nftRole);

      console.log('Calling hasRole for address(0)...');
      const isGloballyWhitelisted = await permissionsContract.hasRole(
        nftRole,
        '0x0000000000000000000000000000000000000000'
      );

      console.log('Global NFT whitelist (address(0)):', isGloballyWhitelisted);

      if (isGloballyWhitelisted) {
        console.log('All NFT contracts are globally whitelisted via address(0)');
        return NextResponse.json({
          success: true,
          data: {
            isWhitelisted: true,
            collectionAddress: normalizedAddress,
            globalWhitelist: true,
            requests: [],
          },
        });
      }

      // Step 2: Check if specific collection has NFT_ROLE
      const hasSpecificRole = await permissionsContract.hasRole(nftRole, collectionAddress);

      console.log('Specific collection has NFT_ROLE:', hasSpecificRole);

      if (hasSpecificRole) {
        console.log('Collection is specifically whitelisted');
        return NextResponse.json({
          success: true,
          data: {
            isWhitelisted: true,
            collectionAddress: normalizedAddress,
            specificWhitelist: true,
            requests: [],
          },
        });
      }
    } catch (contractError) {
      console.error('Error checking contract whitelist:', contractError);
      // Continue to DB check if contract check fails
    }

    // Step 3: Fallback to DB check (legacy or for additional info)
    const result = await graphqlClient.query(CHECK_NFT_WHITELIST_QUERY, {
      collectionAddress: normalizedAddress,
    });

    console.log('GraphQL result:', JSON.stringify(result, null, 2));

    const isWhitelisted = result?.nftRoleRequests && result.nftRoleRequests.length > 0;

    console.log('Is whitelisted in DB:', isWhitelisted);
    if (isWhitelisted) {
      console.log('Found requests:', result.nftRoleRequests);
    }

    return NextResponse.json({
      success: true,
      data: {
        isWhitelisted,
        collectionAddress: normalizedAddress,
        requests: result?.nftRoleRequests || [],
      },
    });
  } catch (error) {
    console.error('Error checking NFT whitelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check NFT whitelist' },
      { status: 500 }
    );
  }
}
