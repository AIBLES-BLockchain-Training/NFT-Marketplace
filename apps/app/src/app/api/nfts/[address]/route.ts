import { NextRequest, NextResponse } from 'next/server';
import Moralis from 'moralis';

async function initMoralis() {
  // Check if Moralis Core is already started
  if (!(Moralis.Core as any).isStarted) {
    await Moralis.start({
      apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
    });
  }
}

// Chain name to ID mapping
const CHAIN_IDS: Record<string, string> = {
  sepolia: '0xaa36a7', // 11155111 in decimal
  mainnet: '0x1',
  goerli: '0x5',
  polygon: '0x89',
};

// Set dynamic route timeout to 60 seconds
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const { searchParams } = new URL(request.url);
    const chainName = searchParams.get('chain') || 'sepolia';
    const chain = CHAIN_IDS[chainName] || CHAIN_IDS.sepolia;

    await initMoralis();

    // Add timeout wrapper for Moralis call
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Moralis API timeout after 30s')), 30000);
    });

    const moralisCall = Moralis.EvmApi.nft.getWalletNFTs({
      address,
      chain,
      limit: 100,
      normalizeMetadata: true,
    });

    const response = await Promise.race([moralisCall, timeout]) as any;

    return NextResponse.json({
      success: true,
      data: response.raw.result,
    });
  } catch (error: any) {
    console.error('Error fetching NFTs from Moralis:', error);

    // Return empty array instead of error to prevent UI crash
    // This allows the app to continue working even if Moralis is down
    return NextResponse.json({
      success: true,
      data: [],
      warning: error.message || 'Failed to fetch NFTs from Moralis',
    });
  }
}
