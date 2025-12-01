import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// GET: Retrieve collection metadata
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionAddress = searchParams.get('address');

    if (!collectionAddress) {
      return NextResponse.json(
        { error: 'Collection address is required' },
        { status: 400 }
      );
    }

    // Get document from Firestore
    const docRef = doc(db, 'collections', collectionAddress.toLowerCase());
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { exists: false, data: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      exists: true,
      data: docSnap.data(),
    });
  } catch (error: unknown) {
    console.error('Error getting collection metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to get collection metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Save collection metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      collectionAddress,
      bannerURI,
      logoURI,
      ownerAddress,
      name,
      description,
    } = body;

    // Validation
    if (!collectionAddress) {
      return NextResponse.json(
        { error: 'Collection address is required' },
        { status: 400 }
      );
    }

    if (!ownerAddress) {
      return NextResponse.json(
        { error: 'Owner address is required' },
        { status: 400 }
      );
    }

    // Prepare metadata
    const metadata: {
      bannerURI?: string;
      logoURI?: string;
      ownerAddress: string;
      name?: string;
      description?: string;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      ownerAddress: ownerAddress.toLowerCase(),
      updatedAt: serverTimestamp(),
    };

    if (bannerURI) metadata.bannerURI = bannerURI;
    if (logoURI) metadata.logoURI = logoURI;
    if (name) metadata.name = name;
    if (description) metadata.description = description;

    // Save to Firestore
    const docRef = doc(db, 'collections', collectionAddress.toLowerCase());
    await setDoc(docRef, metadata, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Collection metadata saved successfully',
      data: metadata,
    });
  } catch (error: unknown) {
    console.error('Error saving collection metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to save collection metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: Update collection metadata
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { collectionAddress, bannerURI, logoURI } = body;

    if (!collectionAddress) {
      return NextResponse.json(
        { error: 'Collection address is required' },
        { status: 400 }
      );
    }

    const updates: {
      bannerURI?: string;
      logoURI?: string;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      updatedAt: serverTimestamp(),
    };

    if (bannerURI !== undefined) updates.bannerURI = bannerURI;
    if (logoURI !== undefined) updates.logoURI = logoURI;

    // Update Firestore document
    const docRef = doc(db, 'collections', collectionAddress.toLowerCase());
    await setDoc(docRef, updates, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Collection metadata updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating collection metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to update collection metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
