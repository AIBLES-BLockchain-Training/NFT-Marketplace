'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { UserAvatar } from '../common/UserAvatar';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  currentName?: string;
  currentAvatarUrl?: string;
}

export function EditProfileModal({
  isOpen,
  onClose,
  address,
  currentName = '',
  currentAvatarUrl,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    if (name.length < 2 || name.length > 50) {
      toast.error('Name must be between 2 and 50 characters');
      return;
    }

    setIsUploading(true);

    try {
      // Upload avatar if file is selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('address', address);
        formData.append('file', selectedFile);

        const uploadResponse = await fetch('/api/user/avatar/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Failed to upload avatar');
        }
      }

      // Update name
      const updateResponse = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          name: name.trim(),
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      // Invalidate query cache to refetch profile
      queryClient.invalidateQueries({ queryKey: ['userProfile', address] });

      toast.success('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setName(currentName);
    setSelectedFile(null);
    setPreviewUrl(currentAvatarUrl || null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Profile">
      <div className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {previewUrl ? (
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-dark-border">
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <UserAvatar address={address} size="xl" />
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {selectedFile ? 'Change Avatar' : 'Upload Avatar'}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            JPG, PNG or GIF. Max 2MB.
          </p>
        </div>

        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Display Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your display name"
            maxLength={50}
            disabled={isUploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            {name.length}/50 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isUploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isUploading || !name.trim()}
            isLoading={isUploading}
            className="flex-1"
          >
            {isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
