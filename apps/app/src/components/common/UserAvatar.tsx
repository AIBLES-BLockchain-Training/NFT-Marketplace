'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';

interface UserAvatarProps {
  address: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-32 h-32 text-2xl',
};

export function UserAvatar({ address, size = 'md', className = '' }: UserAvatarProps) {
  const { data: profile } = useQuery({
    queryKey: ['userProfile', address],
    queryFn: async () => {
      const response = await fetch(`/api/user/profile?address=${address}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.exists ? data.data : null;
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const sizeClass = sizeClasses[size];
  const initials = address ? address.slice(2, 4).toUpperCase() : '??';

  // Generate gradient colors from address
  const getGradientColors = (addr: string) => {
    const hash = parseInt(addr.slice(2, 10), 16);
    const hue1 = hash % 360;
    const hue2 = (hash + 180) % 360;
    return {
      from: `hsl(${hue1}, 70%, 60%)`,
      to: `hsl(${hue2}, 70%, 60%)`,
    };
  };

  const colors = address ? getGradientColors(address) : { from: '#6366f1', to: '#a855f7' };

  if (profile?.avatarUrl) {
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden ${className}`}>
        <Image
          src={profile.avatarUrl}
          alt={profile.name || address}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  // Fallback: Gradient avatar with initials
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
      }}
    >
      {initials}
    </div>
  );
}
