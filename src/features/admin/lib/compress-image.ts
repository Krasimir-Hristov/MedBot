import { ACCEPTED_IMAGE_TYPES } from '../constants'

export interface CompressedImage {
  dataUrl: string
  sizeBytes: number
}

/**
 * Клиентска компресия на скан: JPEG, до 1600px по дългата страна, ~350KB.
 * Библиотеката се зарежда динамично (code-splitting), за да не утежнява началния bundle.
 */
export const compressMedicalImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<CompressedImage> => {
  const isSupported = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)
  if (!isSupported) {
    throw new Error('Unsupported image type')
  }

  const { default: imageCompression } = await import('browser-image-compression')

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.35,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85,
    onProgress,
  })

  const dataUrl = await imageCompression.getDataUrlFromFile(compressed)
  return { dataUrl, sizeBytes: compressed.size }
}
