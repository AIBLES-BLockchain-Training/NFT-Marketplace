import { NextRequest, NextResponse } from 'next/server';
import Moralis from 'moralis';

async function initMoralis() {
  if (!(Moralis.Core as any).isStarted) {
    await Moralis.start({
      apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
    });
  }
}

const CHAIN_IDS: Record<string, string> = {
  sepolia: '0xaa36a7',
  mainnet: '0x1',
  goerli: '0x5',
  polygon: '0x89',
};

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string; tokenId: string } }
) {
  try {
    const { address, tokenId } = params;
    const { searchParams } = new URL(request.url);
    const chainName = searchParams.get('chain') || 'sepolia';
    const chain = CHAIN_IDS[chainName] || CHAIN_IDS.sepolia;

    await initMoralis();

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Moralis API timeout after 30s')), 30000);
    });

    const moralisCall = Moralis.EvmApi.nft.getNFTMetadata({
      address,
      tokenId,
      chain,
      normalizeMetadata: true,
    });

    const response = await Promise.race([moralisCall, timeout]) as any;

    return NextResponse.json({
      success: true,
      data: response.raw,
    });
  } catch (error: any) {
    console.error('Error fetching NFT metadata from Moralis:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch NFT metadata',
    }, { status: 404 });
  }
}
