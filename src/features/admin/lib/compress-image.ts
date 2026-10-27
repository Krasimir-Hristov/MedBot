import { classifyUploadFile, UPLOAD_LIMITS } from '../constants'

export interface CompressedImage {
  dataUrl: string
  sizeBytes: number
}

export interface PreparedUploadFile {
  dataUrl: string
  /** За изображения – размер след компресия; за PDF – undefined (не се компресира). */
  compressedSizeBytes?: number
  mimeType: 'image/jpeg' | 'application/pdf'
}

const resolveCanonicalImageMime = (file: File): 'image/jpeg' | 'image/png' | 'image/webp' => {
  const mime = file.type.trim().toLowerCase()
  const lowerName = file.name.toLowerCase()

  if (mime === 'image/png' || lowerName.endsWith('.png')) {
    return 'image/png'
  }
  if (mime === 'image/webp' || lowerName.endsWith('.webp')) {
    return 'image/webp'
  }
  // Включва .jpg, .jpeg и .jfif (дори когато Windows подава празен или image/jfif MIME тип)
  return 'image/jpeg'
}

const readBlobAsDataUrl = (
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100)
      }
    }
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onProgress?.(100)
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as data URL'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsDataURL(blob)
  })

/**
 * Клиентска компресия на скан (вкл. `.jfif`): JPEG, до 1600px по дългата страна, ~350KB.
 * Библиотеката се зарежда динамично (code-splitting), за да не утежнява началния bundle.
 */
export const compressMedicalImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<CompressedImage> => {
  if (classifyUploadFile(file) !== 'image') {
    throw new Error('Unsupported image type')
  }

  const canonicalMime = resolveCanonicalImageMime(file)
  const normalizedFile =
    file.type === canonicalMime
      ? file
      : new File([file], file.name, { type: canonicalMime, lastModified: file.lastModified })

  const { default: imageCompression } = await import('browser-image-compression')

  const compressed = await imageCompression(normalizedFile, {
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

/**
 * Подготвя медицински файл за качване в `/admin`:
 * - за изображения (JPG, JFIF, PNG, WEBP): компресия до ~350KB JPEG;
 * - за PDF документи: проверка на `%PDF-` сигнатурата и четене като `data:application/pdf;base64,...`.
 */
export const prepareMedicalUploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<PreparedUploadFile> => {
  const kind = classifyUploadFile(file)
  if (!kind) {
    throw new Error('Unsupported file type')
  }

  if (kind === 'pdf') {
    if (file.size > UPLOAD_LIMITS.maxPdfBytes) {
      throw new Error('PDF exceeds maximum allowed size')
    }

    const headerBytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
    const headerText = new TextDecoder('latin1').decode(headerBytes)
    if (!headerText.includes('%PDF-')) {
      throw new Error('Invalid PDF file header')
    }

    const pdfBlob =
      file.type === 'application/pdf' ? file : new Blob([file], { type: 'application/pdf' })
    const dataUrl = await readBlobAsDataUrl(pdfBlob, onProgress)

    return {
      dataUrl,
      mimeType: 'application/pdf',
    }
  }

  const compressed = await compressMedicalImage(file, onProgress)
  return {
    dataUrl: compressed.dataUrl,
    compressedSizeBytes: compressed.sizeBytes,
    mimeType: 'image/jpeg',
  }
}
