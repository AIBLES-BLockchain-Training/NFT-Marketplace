import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (only images)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      );
    }

    // Prepare file for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: `collection-banner-${Date.now()}`,
      keyvalues: {
        type: 'collection-banner',
        uploadedAt: new Date().toISOString(),
      },
    });
    pinataFormData.append('pinataMetadata', metadata);

    // Pin to IPFS via Pinata
    const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT?.trim();

    if (!pinataJWT) {
      return NextResponse.json(
        { error: 'Pinata JWT not configured' },
        { status: 500 }
      );
    }

    const pinataResponse = await fetch(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pinataJWT}`,
        },
        body: pinataFormData,
      }
    );

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      console.error('Pinata error:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload to IPFS', details: errorText },
        { status: 500 }
      );
    }

    const pinataData = await pinataResponse.json();
    const ipfsHash = pinataData.IpfsHash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    return NextResponse.json({
      success: true,
      ipfsHash,
      ipfsUrl,
      pinataData,
    });
  } catch (error: unknown) {
    console.error('Error uploading banner:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload banner',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
