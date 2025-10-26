import { NextRequest, NextResponse } from 'next/server';
import { graphqlClient } from '../../../../lib/graphql/client';

const CHECK_NFT_WHITELIST_QUERY = `
  query CheckNFTWhitelist($collectionAddress: String!) {
    nftRoleRequests(where: { nftAddress_eq: $collectionAddress, status_eq: APPROVED }, limit: 1) {
      id
      nftAddress
      status
    }
  }
`;

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

    // Query indexer DB to check if collection is whitelisted
    const result = await graphqlClient.query(CHECK_NFT_WHITELIST_QUERY, {
      collectionAddress: normalizedAddress,
    });

    console.log('GraphQL result:', JSON.stringify(result, null, 2));

    const isWhitelisted = result?.nftRoleRequests && result.nftRoleRequests.length > 0;

    console.log('Is whitelisted:', isWhitelisted);
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
