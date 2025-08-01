/**
 * an object of contentTypes allowed to be uploaded
 * to Amazon S3
 */
export const contentTypes = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
} as const;

/**
 * a type containng the values of the contentTypes object
 */
export type ContentTypes = (typeof contentTypes)[keyof typeof contentTypes];
