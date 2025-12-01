import { useState } from 'react';
import Image from 'next/image';
import { getIpfsGateways } from '../../lib/utils/format';

interface NFTImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  width?: number; // Image width for optimization (pixels)
}

export function NFTImage({ src, alt, className, sizes, priority = false, width = 400 }: NFTImageProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  // Get all IPFS gateways for fallback with size optimization
  const imageGateways = getIpfsGateways(src, width);
  const imageUrl = imageGateways.length > 0 ? imageGateways[fallbackIndex] : src;

  const handleImageError = () => {
    if (imageGateways.length > 0 && fallbackIndex < imageGateways.length - 1) {
      setFallbackIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  if (!imageUrl || imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      sizes={sizes || "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"}
      className={className}
      priority={priority}
      unoptimized
      onError={handleImageError}
    />
  );
}
