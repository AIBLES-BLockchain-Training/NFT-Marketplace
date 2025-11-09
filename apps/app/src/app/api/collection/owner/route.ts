import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const ERC721_ABI = [
  'function owner() view returns (address)',
  'function supportsInterface(bytes4) view returns (bool)',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionAddress = searchParams.get('address');
    const userAddress = searchParams.get('user');

    if (!collectionAddress) {
      return NextResponse.json(
        { error: 'Collection address is required' },
        { status: 400 }
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT
    );

    // Create contract instance
    const contract = new ethers.Contract(
      collectionAddress,
      ERC721_ABI,
      provider
    );

    // Check if contract has owner() function
    let contractOwner: string;
    try {
      contractOwner = await contract.owner();
    } catch (error) {
      return NextResponse.json(
        {
          isOwner: false,
          error: 'Contract does not have owner() function or is not ownable',
        },
        { status: 200 }
      );
    }

    // Compare addresses (case-insensitive)
    const isOwner =
      contractOwner.toLowerCase() === userAddress.toLowerCase();

    return NextResponse.json({
      isOwner,
      contractOwner,
      userAddress,
    });
  } catch (error: unknown) {
    console.error('Error checking collection owner:', error);
    return NextResponse.json(
      {
        error: 'Failed to check collection owner',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
