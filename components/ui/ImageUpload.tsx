'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faCamera,
    faCloudUploadAlt,
    faCrop,
    faExclamationTriangle,
    faImage,
    faSpinner,
    faTrash,
} from '@fortawesome/free-solid-svg-icons';
import ImageEditor from './ImageEditor';

// Configuration based on UI/UX expert recommendations
const CONFIG = {
    maxFileSizeMB: 10, // Allow larger files for HEIC since they will be converted
    maxCompressedSizeMB: 1,
    maxWidthOrHeight: 2048,
    minWidth: 400,
    minHeight: 300,
    allowedFormats: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'image/heic': ['.heic'],
        'image/heif': ['.heif'],
    } as Record<string, string[]>,
    compressionQuality: 0.85,
};

// Check if file is HEIC/HEIF format
const isHeicFormat = (file: File): boolean => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return (
        type === 'image/heic' ||
        type === 'image/heif' ||
        name.endsWith('.heic') ||
        name.endsWith('.heif')
    );
};

// Convert HEIC/HEIF to JPEG (dynamically imports heic2any)
const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
        });

        // heic2any can return a single blob or array of blobs
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

        // Create a new File from the blob
        const convertedFile = new File(
            [blob],
            file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            {type: 'image/jpeg'}
        );

        return convertedFile;
    } catch (error) {
        console.error('HEIC conversion failed:', error);
        throw new Error('HEIC-Konvertierung fehlgeschlagen. Bitte verwende ein anderes Bildformat.');
    }
};

// Mobile detection
const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

interface ImageUploadProps {
    value?: string;
    onChange: (imageUrl: string | null, file?: File) => void;
    recipeName?: string;
    className?: string;
    disabled?: boolean;
}

type UploadPhase = 'idle' | 'validating' | 'converting' | 'compressing' | 'uploading' | 'ready' | 'error';

interface UploadError {
    type: 'size' | 'format' | 'dimensions' | 'network' | 'unknown';
    message: string;
}

export default function ImageUpload({
                                        value,
                                        onChange,
                                        recipeName = 'Rezept',
                                        className = '',
                                        disabled = false,
                                    }: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [phase, setPhase] = useState<UploadPhase>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<UploadError | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Update preview when value changes externally
    useEffect(() => {
        setPreviewUrl(value || null);
    }, [value]);

    // Get accept string for file input
    const acceptString = Object.entries(CONFIG.allowedFormats)
        .flatMap(([mime, exts]) => [mime, ...exts])
        .join(',');

    // Validate file
    const validateFile = useCallback(async (file: File): Promise<UploadError | null> => {
        // Check format
        const isValidFormat = Object.keys(CONFIG.allowedFormats).includes(file.type);
        if (!isValidFormat) {
            const allowedExts = Object.values(CONFIG.allowedFormats).flat().join(', ');
            return {
                type: 'format',
                message: `${file.type || 'Dieses Format'} wird nicht unterstuetzt. Erlaubt: ${allowedExts}`,
            };
        }

        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > CONFIG.maxFileSizeMB) {
            return {
                type: 'size',
                message: `Das Bild ist ${fileSizeMB.toFixed(1)} MB gross. Bitte waehle ein Bild unter ${CONFIG.maxFileSizeMB} MB.`,
            };
        }

        // Check dimensions (create temporary image)
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                if (img.width < CONFIG.minWidth || img.height < CONFIG.minHeight) {
                    resolve({
                        type: 'dimensions',
                        message: `Das Bild ist nur ${img.width}x${img.height} px. Mindestens ${CONFIG.minWidth}x${CONFIG.minHeight} px erforderlich.`,
                    });
                } else {
                    resolve(null);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                resolve({
                    type: 'unknown',
                    message: 'Das Bild konnte nicht gelesen werden.',
                });
            };
            img.src = URL.createObjectURL(file);
        });
    }, []);

    // Compress image (dynamically imports browser-image-compression)
    const compressImage = useCallback(async (file: File): Promise<File> => {
        const options = {
            maxSizeMB: isMobile() ? 0.5 : CONFIG.maxCompressedSizeMB,
            maxWidthOrHeight: isMobile() ? 1600 : CONFIG.maxWidthOrHeight,
            useWebWorker: true,
            fileType: 'image/webp' as const,
            initialQuality: isMobile() ? 0.8 : CONFIG.compressionQuality,
            onProgress: (percent: number) => {
                setProgress(Math.round(percent));
            },
        };

        try {
            const imageCompression = (await import('browser-image-compression')).default;
            return await imageCompression(file, options);
        } catch {
            // Fallback: return original if compression fails
            console.warn('Compression failed, using original file');
            return file;
        }
    }, []);

    // Process file
    const processFile = useCallback(async (file: File) => {
        setError(null);
        setProgress(0);

        let processedFile = file;

        // Phase 0: Convert HEIC if necessary
        if (isHeicFormat(file)) {
            setPhase('converting');
            try {
                processedFile = await convertHeicToJpeg(file);
            } catch (e) {
                setError({
                    type: 'format',
                    message: e instanceof Error ? e.message : 'HEIC-Konvertierung fehlgeschlagen.',
                });
                setPhase('error');
                return;
            }
        }

        // Phase 1: Validating
        setPhase('validating');
        const validationError = await validateFile(processedFile);
        if (validationError) {
            setError(validationError);
            setPhase('error');
            return;
        }

        // Phase 2: Compressing
        setPhase('compressing');
        const compressedFile = await compressImage(processedFile);

        // Convert to data URL and open editor
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setEditingImageUrl(dataUrl);
            setIsEditorOpen(true);
            setPhase('idle');
        };
        reader.onerror = () => {
            setError({
                type: 'unknown',
                message: 'Fehler beim Lesen des Bildes.',
            });
            setPhase('error');
        };
        reader.readAsDataURL(compressedFile);
    }, [validateFile, compressImage]);

    // Handle editor save - upload cropped image to server
    const handleEditorSave = useCallback(async (croppedImageUrl: string) => {
        setIsEditorOpen(false);
        setEditingImageUrl(null);
        setPhase('uploading');
        setPreviewUrl(croppedImageUrl); // Show preview immediately

        try {
            const response = await fetch('/api/images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({dataUrl: croppedImageUrl}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload fehlgeschlagen');
            }

            const {url} = await response.json();
            setPreviewUrl(url);
            onChange(url);
            setPhase('ready');
        } catch (e) {
            console.error('Image upload failed:', e);
            setError({
                type: 'network',
                message: e instanceof Error ? e.message : 'Upload fehlgeschlagen. Bitte erneut versuchen.',
            });
            setPhase('error');
            setPreviewUrl(null);
        }
    }, [onChange]);

    // Handle editor cancel
    const handleEditorCancel = useCallback(() => {
        setIsEditorOpen(false);
        setEditingImageUrl(null);
    }, []);

    // Open editor for existing image
    const handleOpenEditor = useCallback(() => {
        if (previewUrl) {
            setEditingImageUrl(previewUrl);
            setIsEditorOpen(true);
        }
    }, [previewUrl]);

    // Handle file selection
    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return;
        processFile(files[0]);
    }, [processFile]);

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging false if we're leaving the drop zone itself
        if (e.currentTarget === dropZoneRef.current) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const files = e.dataTransfer?.files;
        handleFileSelect(files);
    }, [disabled, handleFileSelect]);

    // Handle remove image
    const handleRemove = useCallback(() => {
        setPreviewUrl(null);
        setPhase('idle');
        setError(null);
        setProgress(0);
        onChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onChange]);

    // Phase display text
    const getPhaseText = () => {
        switch (phase) {
            case 'converting':
                return 'HEIC wird konvertiert...';
            case 'validating':
                return 'Bild wird ueberprueft...';
            case 'compressing':
                return `Bild wird optimiert... ${progress}%`;
            case 'uploading':
                return 'Bild wird hochgeladen...';
            case 'ready':
                return 'Erfolgreich hochgeladen!';
            case 'error':
                return error?.message || 'Fehler aufgetreten';
            default:
                return '';
        }
    };

    const mobile = isMobile();

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Image Editor Modal */}
            {isEditorOpen && editingImageUrl && (
                <ImageEditor
                    imageUrl={editingImageUrl}
                    onSave={handleEditorSave}
                    onCancel={handleEditorCancel}
                    aspectRatio={4 / 3}
                />
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={acceptString}
                capture={mobile ? 'environment' : undefined}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={disabled}
            />

            {/* Upload Zone or Preview */}
            {previewUrl && phase !== 'error' ? (
                /* Image Preview */
                <div className="relative group rounded-2xl overflow-hidden bg-gray-100">
                    <div className="aspect-[4/3] relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt={recipeName || 'Rezeptbild'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Overlay on hover */}
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                {/* Action buttons left */}
                                <div className="flex items-center gap-2">
                                    {/* Replace button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={disabled}
                                        className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors flex items-center gap-2"
                                    >
                                        <FontAwesomeIcon icon={faImage} className="w-4 h-4"/>
                                        Ersetzen
                                    </button>

                                    {/* Edit button */}
                                    <button
                                        type="button"
                                        onClick={handleOpenEditor}
                                        disabled={disabled}
                                        className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors flex items-center gap-2"
                                    >
                                        <FontAwesomeIcon icon={faCrop} className="w-4 h-4"/>
                                        Bearbeiten
                                    </button>
                                </div>

                                {/* Delete button */}
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    disabled={disabled}
                                    className="p-2.5 bg-red-500/90 backdrop-blur-sm rounded-xl text-white hover:bg-red-600 transition-colors"
                                    aria-label="Bild entfernen"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>

                        {/* Processing indicator */}
                        {(phase === 'converting' || phase === 'validating' || phase === 'compressing' || phase === 'uploading') && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-center text-white">
                                    <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 animate-spin mb-2"/>
                                    <p className="text-sm">{getPhaseText()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Upload Zone */
                <div
                    ref={dropZoneRef}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    className={`
                        relative cursor-pointer
                        border-2 border-dashed rounded-2xl
                        p-8 md:p-10
                        transition-all duration-200
                        ${isDragging
                        ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
                        : error
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-primary/5'
                    }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <div className="flex flex-col items-center text-center">
                        {/* Icon */}
                        <div className={`
                            w-16 h-16 rounded-full flex items-center justify-center mb-4
                            ${error ? 'bg-red-100' : isDragging ? 'bg-primary/20' : 'bg-white shadow-sm'}
                        `}>
                            <FontAwesomeIcon
                                icon={error ? faExclamationTriangle : phase === 'compressing' ? faSpinner : faCloudUploadAlt}
                                className={`
                                    w-8 h-8
                                    ${error ? 'text-red-500' : isDragging ? 'text-primary' : 'text-gray-400'}
                                    ${phase === 'compressing' ? 'animate-spin' : ''}
                                `}
                            />
                        </div>

                        {/* Text */}
                        {error ? (
                            <div className="space-y-2">
                                <p className="text-red-600 font-medium">{error.message}</p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setError(null);
                                        setPhase('idle');
                                    }}
                                    className="text-sm text-red-500 hover:text-red-700 underline"
                                >
                                    Erneut versuchen
                                </button>
                            </div>
                        ) : phase === 'converting' || phase === 'validating' || phase === 'compressing' || phase === 'uploading' ? (
                            <div className="space-y-2">
                                <p className="text-gray-700 font-medium">{getPhaseText()}</p>
                                {phase === 'compressing' && (
                                    <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{width: `${progress}%`}}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {mobile ? (
                                    /* Mobile Layout */
                                    <div className="space-y-3 w-full max-w-xs">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.capture = 'environment';
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                            className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faCamera} className="w-5 h-5"/>
                                            Foto aufnehmen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.removeAttribute('capture');
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                            className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
                                        >
                                            <FontAwesomeIcon icon={faImage} className="w-5 h-5"/>
                                            Aus Galerie waehlen
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">
                                            JPG, PNG, WebP - Max. {CONFIG.maxFileSizeMB} MB
                                        </p>
                                    </div>
                                ) : (
                                    /* Desktop Layout */
                                    <>
                                        <p className="text-gray-700 font-medium mb-1">
                                            {isDragging ? 'Loslassen zum Hochladen' : 'Bild hierher ziehen'}
                                        </p>
                                        <p className="text-gray-500 text-sm mb-3">oder</p>
                                        <span
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                            <FontAwesomeIcon icon={faImage} className="w-4 h-4"/>
                                            Datei auswaehlen
                                        </span>
                                        <p className="text-xs text-gray-500 mt-4">
                                            JPG, PNG, WebP - Max. {CONFIG.maxFileSizeMB} MB -
                                            Min. {CONFIG.minWidth}x{CONFIG.minHeight} px
                                        </p>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Action buttons for mobile when image exists */}
            {previewUrl && mobile && phase !== 'error' && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        className="flex-1 py-3 px-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
                    >
                        <FontAwesomeIcon icon={faImage} className="w-4 h-4"/>
                        Ersetzen
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenEditor}
                        disabled={disabled}
                        className="flex-1 py-3 px-3 bg-primary/10 text-primary rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
                    >
                        <FontAwesomeIcon icon={faCrop} className="w-4 h-4"/>
                        Bearbeiten
                    </button>
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={disabled}
                        className="py-3 px-4 bg-red-100 text-red-600 rounded-xl font-medium flex items-center justify-center"
                        aria-label="Loeschen"
                    >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4"/>
                    </button>
                </div>
            )}
        </div>
    );
}