/**
 * Cloudflare R2 Storage Integration
 * 
 * Exporta todas as funções e tipos necessários para trabalhar com R2
 */

// Cliente R2
export {
  getR2Client,
  getR2ClientInstance,
  getR2Config,
  getPublicUrl,
  type R2Config,
} from './r2-client'

// Upload
export {
  uploadFile,
  uploadInvoice,
  uploadProductImage,
  uploadContract,
  uploadReport,
  generatePresignedUploadUrl,
  generateInvoiceUploadUrl,
  generateProductImageUploadUrl,
  generateFileName,
  validateFile,
  FileValidationError,
  FILE_TYPES,
  MAX_FILE_SIZES,
  type UploadOptions,
  type UploadResult,
  type PresignedUploadUrl,
} from './upload'

// Download
export {
  generatePresignedDownloadUrl,
  getFilePublicUrl,
  downloadFile,
  getFileMetadata,
  fileExists,
  listFiles,
  listAllFiles,
  deleteFile,
  deleteFiles,
  deleteFolder,
  generateInvoiceDownloadUrl,
  generateProductImageUrl,
  generateContractDownloadUrl,
  listInvoices,
  listProductImages,
  listContracts,
  listReports,
  type DownloadOptions,
  type FileMetadata,
  type ListFilesOptions,
  type ListFilesResult,
} from './download'
