export const BYTES_PER_MB = 1024 * 1024;

// Every mime type any purpose accepts, with the extension its keys get.
export const FILE_EXTENSIONS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
} as const;

export type UploadMimeType = keyof typeof FILE_EXTENSIONS;

export const UPLOAD_MIME_TYPES = Object.keys(
  FILE_EXTENSIONS,
) as UploadMimeType[];

export type UploadPurposeConfig = {
  mimeTypes: readonly UploadMimeType[];
  maxBytes: number;
};

// The one place upload mime types and size limits are stated.
export const UPLOAD_PURPOSES = {
  "primary-resume": {
    mimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 5 * BYTES_PER_MB,
  },
} as const satisfies Record<string, UploadPurposeConfig>;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

export const UPLOAD_PURPOSE_VALUES = Object.keys(
  UPLOAD_PURPOSES,
) as UploadPurpose[];

// What an upload returns, sent back to refer to that file.
export type UploadedFileRef = {
  key: string;
  mimeType: UploadMimeType;
};
