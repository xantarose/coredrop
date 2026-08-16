export const FILE_TYPES = {
  DOCUMENTS: {
    name: 'Документы',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'odt', 'rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  SPREADSHEETS: {
    name: 'Таблицы',
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    mimeTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  PRESENTATIONS: {
    name: 'Презентации',
    extensions: ['ppt', 'pptx', 'odp'],
    mimeTypes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  },
  IMAGES: {
    name: 'Изображения',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
  },
  VIDEOS: {
    name: 'Видео',
    extensions: ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska', 'video/webm'],
  },
  AUDIO: {
    name: 'Аудио',
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg'],
  },
  ARCHIVES: {
    name: 'Архивы',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  },
  CODE: {
    name: 'Код',
    extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'sh', 'bash', 'json', 'xml', 'sql'],
    mimeTypes: ['text/javascript', 'text/typescript', 'text/html', 'text/css', 'text/x-python'],
  },
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024

export const ALLOWED_EXTENSIONS = Object.values(FILE_TYPES).flatMap(type => type.extensions)

export const getFileType = (fileName: string): string | null => {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  for (const [key, type] of Object.entries(FILE_TYPES)) {
    if (type.extensions.includes(extension)) {
      return key
    }
  }

  return null
}
