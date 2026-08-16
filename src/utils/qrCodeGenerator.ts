import QRCode from 'qrcode'

interface QRCodeOptions {
  size?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark?: string
    light?: string
  }
}

export const generateQRCode = async (
  text: string,
  options?: QRCodeOptions
): Promise<string> => {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text for QR code generation')
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: options?.size || 300,
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      },
      margin: 2
    })

    return dataUrl
  } catch (error) {
    throw new Error('Failed to generate QR code')
  }
}

export const downloadQRCode = (dataUrl: string, filename: string = 'qrcode.png') => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
