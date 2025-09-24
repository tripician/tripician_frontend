export interface FileValidationRule {
  maxSizeBytes?: number;              // per file limit
  allowedTypes?: string[];            // exact MIME types
  allowedTypePrefixes?: string[];     // e.g. 'image/', 'text/'
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFile(file: File, rule: FileValidationRule): FileValidationResult {
  const errors: string[] = [];
  if(rule.maxSizeBytes != null && file.size > rule.maxSizeBytes) {
    errors.push(`File ${file.name} exceeds size limit ${(rule.maxSizeBytes/1024/1024).toFixed(1)}MB`);
  }
  if(rule.allowedTypes && rule.allowedTypes.length>0 && !rule.allowedTypes.includes(file.type)) {
    const prefOk = rule.allowedTypePrefixes?.some(p=> file.type.startsWith(p));
    if(!prefOk) errors.push(`File ${file.name} type ${file.type||'unknown'} not allowed`);
  }
  if(!rule.allowedTypes && rule.allowedTypePrefixes && rule.allowedTypePrefixes.length>0) {
    if(!rule.allowedTypePrefixes.some(p=> file.type.startsWith(p))) {
      errors.push(`File ${file.name} type ${file.type||'unknown'} not allowed`);
    }
  }
  return { valid: errors.length===0, errors };
}

export function validateFiles(files: FileList | File[], rule: FileValidationRule): { accepted: File[]; rejected: { file: File; errors: string[] }[] } {
  const accepted: File[] = [];
  const rejected: { file: File; errors: string[] }[] = [];
  Array.from(files).forEach(f=> {
    const res = validateFile(f, rule);
    if(res.valid) accepted.push(f); else rejected.push({ file:f, errors: res.errors });
  });
  return { accepted, rejected };
}

// Default rule for docs (can be shared across upload contexts)
export const DEFAULT_DOC_RULE: FileValidationRule = {
  maxSizeBytes: 8 * 1024 * 1024, // 8MB
  allowedTypePrefixes: ['image/','text/','application/pdf']
};
