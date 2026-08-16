export const formatFileSize = (bytes: number | undefined | null): string => {
  if (!bytes || bytes <= 0 || isNaN(bytes)) {
    return '0 Б'
  }

  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
