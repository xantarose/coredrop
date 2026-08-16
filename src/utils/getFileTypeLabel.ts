export const getFileTypeLabel = (mimeType: string, fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  if (mimeType.startsWith('image/')) {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'JPEG изображение'
    if (mimeType === 'image/png') return 'PNG изображение'
    if (mimeType === 'image/gif') return 'GIF изображение'
    if (mimeType === 'image/webp') return 'WebP изображение'
    if (mimeType === 'image/svg+xml') return 'SVG изображение'
    if (mimeType === 'image/bmp') return 'BMP изображение'
    if (mimeType === 'image/tiff') return 'TIFF изображение'
    if (mimeType === 'image/x-icon') return 'ICO изображение'
    if (mimeType === 'image/heic') return 'HEIC изображение'
    if (mimeType === 'image/heif') return 'HEIF изображение'
    if (mimeType === 'image/avif') return 'AVIF изображение'
    return 'Изображение'
  }

  if (mimeType.startsWith('video/')) {
    if (mimeType === 'video/mp4') return 'MP4 видео'
    if (mimeType === 'video/webm') return 'WebM видео'
    if (mimeType === 'video/quicktime') return 'MOV видео'
    if (mimeType === 'video/x-msvideo') return 'AVI видео'
    if (mimeType === 'video/x-matroska') return 'MKV видео'
    if (mimeType === 'video/mpeg') return 'MPEG видео'
    if (mimeType === 'video/ogg') return 'OGG видео'
    if (mimeType === 'video/3gpp') return '3GP видео'
    if (mimeType === 'video/x-flv') return 'FLV видео'
    if (mimeType === 'video/mp2t') return 'TS видео'
    return 'Видео'
  }

  if (mimeType.startsWith('audio/')) {
    if (mimeType === 'audio/mpeg' || extension === 'mp3') return 'MP3 аудио'
    if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return 'WAV аудио'
    if (mimeType === 'audio/ogg') return 'OGG аудио'
    if (mimeType === 'audio/mp4' || mimeType === 'audio/aac') return 'AAC аудио'
    if (mimeType === 'audio/x-m4a') return 'M4A аудио'
    if (mimeType === 'audio/flac') return 'FLAC аудио'
    if (mimeType === 'audio/webm') return 'WebM аудио'
    if (mimeType === 'audio/midi' || mimeType === 'audio/x-midi') return 'MIDI аудио'
    return 'Аудио'
  }

  if (mimeType === 'application/pdf') return 'PDF документ'

  if (mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extension === 'docx' ? 'DOCX документ' : 'DOC документ'
  }

  if (mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return extension === 'xlsx' ? 'XLSX таблица' : 'XLS таблица'
  }

  if (mimeType === 'application/vnd.ms-powerpoint' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return extension === 'pptx' ? 'PPTX презентация' : 'PPT презентация'
  }

  if (mimeType === 'application/vnd.oasis.opendocument.text') return 'ODT документ'
  if (mimeType === 'application/vnd.oasis.opendocument.spreadsheet') return 'ODS таблица'
  if (mimeType === 'application/vnd.oasis.opendocument.presentation') return 'ODP презентация'

  if (mimeType === 'application/zip' ||
      mimeType === 'application/x-zip-compressed' ||
      extension === 'zip') return 'ZIP архив'
  if (mimeType === 'application/x-rar-compressed' ||
      mimeType === 'application/vnd.rar' ||
      extension === 'rar') return 'RAR архив'
  if (mimeType === 'application/x-7z-compressed' || extension === '7z') return '7Z архив'
  if (mimeType === 'application/x-tar' || extension === 'tar') return 'TAR архив'
  if (mimeType === 'application/gzip' || extension === 'gz') return 'GZIP архив'
  if (mimeType === 'application/x-bzip2' || extension === 'bz2') return 'BZIP2 архив'

  if (mimeType === 'text/plain') return 'Текстовый файл'
  if (mimeType === 'text/csv') return 'CSV таблица'
  if (mimeType === 'text/html') return 'HTML документ'
  if (mimeType === 'text/css') return 'CSS файл'
  if (mimeType === 'text/javascript' || mimeType === 'application/javascript') return 'JavaScript файл'
  if (mimeType === 'application/json') return 'JSON файл'
  if (mimeType === 'application/xml' || mimeType === 'text/xml') return 'XML файл'
  if (mimeType === 'application/x-yaml' || mimeType === 'text/yaml') return 'YAML файл'
  if (mimeType === 'text/markdown') return 'Markdown файл'
  if (mimeType === 'application/rtf') return 'RTF документ'
  if (mimeType === 'application/x-sh') return 'Shell скрипт'

  if (extension === 'exe') return 'EXE файл'
  if (extension === 'dmg') return 'DMG образ'
  if (extension === 'apk') return 'APK приложение'
  if (extension === 'iso') return 'ISO образ'
  if (extension === 'jar') return 'JAR архив'
  if (extension === 'py') return 'Python скрипт'
  if (extension === 'java') return 'Java файл'
  if (extension === 'cpp' || extension === 'cc') return 'C++ файл'
  if (extension === 'c') return 'C файл'
  if (extension === 'h') return 'Header файл'
  if (extension === 'ts') return 'TypeScript файл'
  if (extension === 'tsx') return 'TypeScript React файл'
  if (extension === 'jsx') return 'JavaScript React файл'
  if (extension === 'php') return 'PHP файл'
  if (extension === 'sql') return 'SQL файл'
  if (extension === 'db' || extension === 'sqlite') return 'База данных'

  return 'Файл'
}
