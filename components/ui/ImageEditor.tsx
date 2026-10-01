'use client';

import {useCallback, useEffect, useState} from 'react';
import Cropper, {Area, MediaSize, Point} from 'react-easy-crop';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faRotateLeft, faRotateRight, faTimes, faUndo,} from '@fortawesome/free-solid-svg-icons';

interface ImageEditorProps {
    imageUrl: string;
    onSave: (croppedImageUrl: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
}

// Calculate minimum zoom needed to avoid black borders when rotating
function getMinZoomForRotation(
    mediaSize: MediaSize,
    rotation: number,
    aspectRatio: number
): number {
    const {width, height} = mediaSize;
    const rotationRad = Math.abs(rotation) * (Math.PI / 180);

    // For the rotated image to fully cover the crop area without black corners,
    // we need to calculate the inscribed rectangle
    const cosAngle = Math.abs(Math.cos(rotationRad));
    const sinAngle = Math.abs(Math.sin(rotationRad));

    // Calculate the effective size of the rotated image
    const rotatedWidth = width * cosAngle + height * sinAngle;
    const rotatedHeight = width * sinAngle + height * cosAngle;

    // Calculate crop area dimensions (based on aspect ratio)
    // The crop area fits within the container
    const imageAspect = width / height;
    let cropWidth, cropHeight;

    if (imageAspect > aspectRatio) {
        cropHeight = height;
        cropWidth = cropHeight * aspectRatio;
    } else {
        cropWidth = width;
        cropHeight = cropWidth / aspectRatio;
    }

    // Calculate minimum zoom to ensure rotated image covers crop area
    const zoomX = cropWidth / (width * cosAngle - Math.abs(cropHeight * sinAngle / (height / width)));
    const zoomY = cropHeight / (height * cosAngle - Math.abs(cropWidth * sinAngle / (width / height)));

    // Simpler approximation that works well in practice
    const rotationFactor = 1 + Math.abs(Math.sin(2 * rotationRad)) * 0.5;

    return Math.max(1, rotationFactor);
}

// Helper function to create cropped image
async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
): Promise<string> {
    const image = await createImage(imageSrc);

    const cropWidth = Math.max(1, Math.round(pixelCrop.width));
    const cropHeight = Math.max(1, Math.round(pixelCrop.height));
    const cropX = Math.max(0, Math.round(pixelCrop.x));
    const cropY = Math.max(0, Math.round(pixelCrop.y));

    const normalizedRotation = ((rotation % 360) + 360) % 360;

    if (normalizedRotation === 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2d context');

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(
            image,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );

        return canvas.toDataURL('image/jpeg', 0.9);
    }

    const rotRad = (normalizedRotation * Math.PI) / 180;
    const bBoxWidth = Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
    const bBoxHeight = Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

    const rotatedCanvas = document.createElement('canvas');
    const rotatedCtx = rotatedCanvas.getContext('2d');
    if (!rotatedCtx) throw new Error('No 2d context');

    rotatedCanvas.width = bBoxWidth;
    rotatedCanvas.height = bBoxHeight;

    rotatedCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
    rotatedCtx.rotate(rotRad);
    rotatedCtx.translate(-image.width / 2, -image.height / 2);
    rotatedCtx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) throw new Error('No 2d context');

    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;

    croppedCtx.drawImage(
        rotatedCanvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
    );

    return croppedCanvas.toDataURL('image/jpeg', 0.9);
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        if (!url.startsWith('data:')) {
            image.crossOrigin = 'anonymous';
        }
        image.src = url;
    });
}

export default function ImageEditor({
                                        imageUrl,
                                        onSave,
                                        onCancel,
                                        aspectRatio = 4 / 3,
                                    }: ImageEditorProps) {
    const [crop, setCrop] = useState<Point>({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);

    // Update minimum zoom when rotation changes
    useEffect(() => {
        if (mediaSize) {
            const newMinZoom = getMinZoomForRotation(mediaSize, rotation, aspectRatio);
            setMinZoom(newMinZoom);

            // Increase zoom if current zoom is below minimum
            if (zoom < newMinZoom) {
                setZoom(newMinZoom);
            }
        }
    }, [rotation, mediaSize, aspectRatio, zoom]);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
        setMediaSize(mediaSize);
        const newMinZoom = getMinZoomForRotation(mediaSize, 0, aspectRatio);
        setMinZoom(newMinZoom);
        setZoom(newMinZoom);
    }, [aspectRatio]);

    const handleRotationChange = useCallback((newRotation: number) => {
        setRotation(newRotation);
    }, []);

    const handleReset = useCallback(() => {
        setCrop({x: 0, y: 0});
        setRotation(0);
        if (mediaSize) {
            const newMinZoom = getMinZoomForRotation(mediaSize, 0, aspectRatio);
            setMinZoom(newMinZoom);
            setZoom(newMinZoom);
        } else {
            setZoom(1);
            setMinZoom(1);
        }
    }, [mediaSize, aspectRatio]);

    const handleSave = useCallback(async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(
                imageUrl,
                croppedAreaPixels,
                rotation
            );

            if (!croppedImage || croppedImage === 'data:,') {
                throw new Error('Failed to generate cropped image');
            }

            onSave(croppedImage);
        } catch (e) {
            console.error('Error cropping image:', e);
            onSave(imageUrl);
        } finally {
            setIsProcessing(false);
        }
    }, [imageUrl, croppedAreaPixels, rotation, onSave]);

    return (
        <div className="fixed inset-0 z-9999 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-black/70 relative z-50">
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition-all"
                    aria-label="Abbrechen"
                >
                    <FontAwesomeIcon icon={faTimes} className="w-6 h-6"/>
                </button>
                <h2 className="text-white font-semibold text-lg">Bild bearbeiten</h2>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/40 hover:text-green-300 transition-all disabled:opacity-50"
                    aria-label="Speichern"
                >
                    {isProcessing ? (
                        <span
                            className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin inline-block"/>
                    ) : (
                        <FontAwesomeIcon icon={faCheck} className="w-6 h-6"/>
                    )}
                </button>
            </div>

            {/* Cropper Area */}
            <div className="flex-1 relative">
                <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    minZoom={minZoom}
                    maxZoom={5}
                    rotation={rotation}
                    aspect={aspectRatio}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    onMediaLoaded={onMediaLoaded}
                    restrictPosition={true}
                    showGrid={true}
                    classes={{
                        containerClassName: 'bg-black',
                        cropAreaClassName: 'border-2 border-white',
                    }}
                />
            </div>

            {/* Controls */}
            <div className="bg-black/80 backdrop-blur-xs px-4 py-4 space-y-4 relative z-50">
                {/* Rotation Slider */}
                <div className="flex items-center gap-4">
                    <FontAwesomeIcon icon={faRotateLeft} className="w-5 h-5 text-white/70"/>
                    <div className="flex-1 flex flex-col gap-1">
                        <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={rotation}
                            onChange={(e) => handleRotationChange(Number(e.target.value))}
                            className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-5
                                [&::-webkit-slider-thumb]:h-5
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-white
                                [&::-webkit-slider-thumb]:shadow-lg
                                [&::-webkit-slider-thumb]:cursor-pointer"
                            aria-label="Drehung"
                        />
                        <div className="flex justify-between text-white/50 text-xs">
                            <span>-180°</span>
                            <span className="text-white font-medium">{rotation}°</span>
                            <span>180°</span>
                        </div>
                    </div>
                    <FontAwesomeIcon icon={faRotateRight} className="w-5 h-5 text-white/70"/>
                </div>

                {/* Reset Button */}
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    >
                        <FontAwesomeIcon icon={faUndo} className="w-4 h-4"/>
                        <span className="text-sm">Zuruecksetzen</span>
                    </button>
                </div>

                {/* Info */}
                <div className="flex items-center justify-center gap-4 text-white/50 text-xs">
                    <span>Bild ziehen zum Verschieben</span>
                    <span>Scrollen/Pinch zum Zoomen</span>
                </div>
            </div>
        </div>
    );
}
