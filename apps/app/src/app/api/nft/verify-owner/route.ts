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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, contractAddress, tokenId, chain = 'sepolia' } = body;

    if (!address || !contractAddress || !tokenId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Fetch all NFTs owned by the address directly from Moralis
    let nfts;
    try {
      await initMoralis();

      const chainId = CHAIN_IDS[chain] || CHAIN_IDS.sepolia;

      const response = await Moralis.EvmApi.nft.getWalletNFTs({
        address,
        chain: chainId,
        limit: 100,
        normalizeMetadata: true,
      });

      nfts = response.raw.result;
    } catch (error) {
      console.error('Error fetching NFTs from Moralis:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch NFTs from Moralis' },
        { status: 500 }
      );
    }

    // Check if any NFT matches the contract and token ID
    const matchingNFT = nfts.find(
      (nft: any) =>
        nft.token_address.toLowerCase() === contractAddress.toLowerCase() &&
        nft.token_id === tokenId
    );

    const isOwner = !!matchingNFT;

    return NextResponse.json({
      success: true,
      data: {
        isOwner,
      },
    });
  } catch (error: any) {
    console.error('Error verifying NFT ownership:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify ownership' },
      { status: 500 }
    );
  }
}
