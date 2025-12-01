import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Avatar upload request received');

    const formData = await request.formData();
    const address = formData.get('address') as string;
    const file = formData.get('file') as File;

    console.log('Address:', address);
    console.log('File:', file?.name, file?.type, file?.size);

    if (!address || !file) {
      return NextResponse.json(
        { error: 'Address and file are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed');

    // Prepare file for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: `avatar-${address}-${Date.now()}`,
      keyvalues: {
        type: 'user-avatar',
        address: address.toLowerCase(),
        uploadedAt: new Date().toISOString(),
      },
    });
    pinataFormData.append('pinataMetadata', metadata);

    // Pin to IPFS via Pinata
    console.log('⬆️  Uploading to Pinata IPFS...');
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
    const avatarUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    console.log('✅ Upload successful, URL:', avatarUrl);

    // Update user profile in Firestore
    console.log('💾 Updating Firestore...');
    const userRef = doc(db, 'users', address.toLowerCase());
    await setDoc(
      userRef,
      {
        avatarUrl,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('✅ Firestore updated');

    return NextResponse.json({
      success: true,
      avatarUrl,
      ipfsHash,
    });
  } catch (error: any) {
    console.error('❌ Error uploading avatar:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: 'Failed to upload avatar',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
