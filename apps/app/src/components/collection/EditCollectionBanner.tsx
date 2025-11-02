'use client';

import { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import toast from 'react-hot-toast';

interface EditCollectionBannerProps {
  isOpen: boolean;
  onClose: () => void;
  collectionAddress: string;
  currentBannerUrl?: string;
  onSuccess: () => void;
}

export function EditCollectionBanner({
  isOpen,
  onClose,
  collectionAddress,
  currentBannerUrl,
  onSuccess,
}: EditCollectionBannerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only images are allowed.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum 10MB allowed.');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Upload to IPFS
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/collection/upload-banner', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload banner');
      }

      const uploadData = await uploadResponse.json();
      const { ipfsUrl } = uploadData;

      // Step 2: Save to Firestore
      const metadataResponse = await fetch('/api/collection/metadata', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collectionAddress,
          bannerURI: ipfsUrl,
        }),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json();
        throw new Error(errorData.error || 'Failed to save banner metadata');
      }

      toast.success('Banner updated successfully!');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload banner');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Collection Banner">
      <div className="space-y-6">
        {/* Current Banner Preview */}
        {(previewUrl || currentBannerUrl) && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              {previewUrl ? 'New Banner Preview' : 'Current Banner'}
            </p>
            <div className="w-full h-48 rounded-lg overflow-hidden bg-dark-bg">
              <img
                src={previewUrl || currentBannerUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* File Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Upload New Banner
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              disabled={isUploading}
            >
              Choose File
            </Button>
            {selectedFile && (
              <span className="text-sm text-gray-400 truncate">
                {selectedFile.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Recommended: 1400 x 400px, Max 10MB (JPG, PNG, GIF, WebP)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            variant="secondary"
            disabled={isUploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">Uploading...</span>
              </>
            ) : (
              'Upload Banner'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
