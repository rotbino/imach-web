// components/common/FileUploader.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useDeleteFile } from '@/lib/api/apiHooks';

interface FileUploaderProps {
    width?: number;
    height?: number;
    className?: string;
    accept?: string;
    label?: string;
    model?: 'User' | 'Catalog' | 'Ad';
    modelId?: string;
    fieldKey?: string;
    value?: string | null;
    onFileSelect: (file: File | null) => void;
    onRemove?: () => void;
    onSuccess?: (fileId: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    showPreview?: boolean;
    rounded?: boolean;
    showDeleteBtn?: boolean;
    error?: string;
    previewUrl?: string; // جدید
}

export function FileUploader({
                                 width = 120,
                                 height = 120,
                                 className = '',
                                 accept = 'image/*',
                                 label = 'انتخاب فایل',
                                 model,
                                 modelId,
                                 fieldKey,
                                 value,
                                 onFileSelect,
                                 onRemove,
                                 onSuccess,
                                 onError,
                                 disabled = false,
                                 showPreview = true,
                                 rounded = true,
                                 error,
                                 showDeleteBtn = false,
                                 previewUrl,
                             }: FileUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [currentFileId, setCurrentFileId] = useState<string | null>(value || null);
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteMutation = useDeleteFile();

    useEffect(() => {
        setCurrentFileId(value || null);
    }, [value]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setCurrentFileId(null);
        setPreview(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        onFileSelect(file);
    };

    const handleClear = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (currentFileId && model && modelId && fieldKey) {
            setIsDeleting(true);
            try {
                await deleteMutation.mutateAsync(currentFileId);
                console.log('🗑️ File deleted from server:', currentFileId);
            } catch (error) {
                console.warn('⚠️ Could not delete file from server:', error);
            } finally {
                setIsDeleting(false);
            }
        }

        setSelectedFile(null);
        setPreview(null);
        setCurrentFileId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onFileSelect(null);
        onRemove?.();
    };

    const triggerFileSelect = () => {
        if (disabled || isDeleting) return;
        fileInputRef.current?.click();
    };

    const displayPreview = preview || previewUrl || (currentFileId
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/file/${currentFileId}`
        : null);
    const hasFile = !!displayPreview || !!selectedFile;
    const isError = !!error;

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <div
                className={cn(
                    "relative overflow-hidden border-2 border-dashed transition-all",
                    rounded ? 'rounded-full' : 'rounded-lg',
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500',
                    isError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-700',
                    hasFile ? 'border-green-500' : '',
                    isDeleting ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''
                )}
                style={{ width, height }}
                onClick={triggerFileSelect}
            >
                <input
                    type="file"
                    accept={accept}
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={disabled || isDeleting}
                />

                {isDeleting ? (
                    <div className="w-full h-full flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/20">
                        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                    </div>
                ) : displayPreview ? (
                    <div className="w-full h-full relative">
                        <img
                            src={displayPreview}
                            alt="Preview"
                            className={cn(
                                "w-full h-full object-cover",
                                rounded ? 'rounded-full' : 'rounded-lg'
                            )}
                        />
                        {!disabled && !isDeleting && showDeleteBtn && (
                            <button
                                type="button"
                                className="absolute top-2 left-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                onClick={handleClear}
                                disabled={isDeleting}
                            >
                                <X size={16} className="text-red-500" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 p-4 w-full h-full">
                        <UploadCloud size={32} />
                        <span className="text-xs mt-1 text-center">{label}</span>
                    </div>
                )}
            </div>

            {error && (
                <span className="text-xs text-red-500">{error}</span>
            )}
        </div>
    );
}