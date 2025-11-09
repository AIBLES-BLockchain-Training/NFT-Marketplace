import { NextRequest, NextResponse } from 'next/server';

const RARIBLE_BASE_URL = 'https://testnet-api.rarible.org/v0.1';
const RARIBLE_CHAIN_ID = 'ETHEREUM';

interface RaribleCollectionMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  banner_image?: string;
}

/**
 * GET /api/collection/rarible?address=0x...
 * Fetch collection metadata from Rarible API
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Missing address parameter' },
      { status: 400 }
    );
  }

  try {
    const collectionId = `${RARIBLE_CHAIN_ID}:${address}`;
    const url = `${RARIBLE_BASE_URL}/collections/${collectionId}`;

    const headers: Record<string, string> = {
      'accept': 'application/json',
    };

    // Add API key if available (optional for testnet)
    if (process.env.RARIBLE_API_KEY) {
      headers['X-API-KEY'] = process.env.RARIBLE_API_KEY;
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Collection not found', exists: false },
          { status: 404 }
        );
      }

      const errorText = await response.text().catch(() => 'Unknown error');

      return NextResponse.json(
        { error: `Rarible API error: ${response.status}`, exists: false },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract logo and banner from meta.content
    let logoUrl: string | undefined;
    let bannerUrl: string | undefined;

    if (data.meta?.content && Array.isArray(data.meta.content)) {
      for (const item of data.meta.content) {
        // ORIGINAL or PREVIEW for logo
        if (item.representation === 'ORIGINAL' || item.representation === 'PREVIEW') {
          logoUrl = item.url;
        }
        // BIG for banner (if exists)
        if (item.representation === 'BIG') {
          bannerUrl = item.url;
        }
      }
    }

    // Fallback: use cover.url for banner if no BIG representation found
    if (!bannerUrl && data.meta?.cover?.url) {
      bannerUrl = data.meta.cover.url;
    }

    const metadata: RaribleCollectionMetadata = {
      name: data.meta?.name || data.name || 'Unknown Collection',
      symbol: data.symbol || 'NFT',
      description: data.meta?.description || undefined,
      image: logoUrl || undefined,
      banner_image: bannerUrl || undefined,
    };

    return NextResponse.json({
      exists: true,
      data: metadata,
    });
  } catch (error: any) {
    console.error(`[Rarible API] Error fetching collection ${address}:`, error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch collection metadata',
        exists: false
      },
      { status: 500 }
    );
  }
}
