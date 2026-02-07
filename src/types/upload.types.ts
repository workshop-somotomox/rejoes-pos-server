export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface ImageMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}
