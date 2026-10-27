import imageCompression from 'browser-image-compression'

export interface ProcessedUploadFile {
  fileBase64: string
  mimeType: string
  fileName: string
  fileSize: number
}

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const compressAndPrepareFile = async (
  file: File
): Promise<ProcessedUploadFile> => {
  try {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    if (isPdf) {
      if (file.size > MAX_PDF_SIZE_BYTES) {
        throw new Error('PDF файлът надвишава максимално допустимия размер от 10 MB.')
      }

      const dataUrl = await readFileAsDataUrl(file)
      return {
        fileBase64: dataUrl,
        mimeType: 'application/pdf',
        fileName: file.name,
        fileSize: file.size,
      }
    }

    // За снимки (JPEG, PNG, WebP) - клиентска компресия
    const options = {
      maxSizeMB: 0.35,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.85,
    }

    const compressedBlob = await imageCompression(file, options)
    const dataUrl = await readFileAsDataUrl(compressedBlob)

    return {
      fileBase64: dataUrl,
      mimeType: 'image/jpeg',
      fileName: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
      fileSize: compressedBlob.size,
    }
  } catch (error) {
    console.error('Error compressing/preparing file:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Неуспешна подготовка на файла за качване.')
  }
}

const readFileAsDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Неуспешно четене на файла като Base64 data URL.'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
