import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { validateFiles, type FileValidationRule } from '../../utils/fileValidation';

export interface ValidatedFileInputProps {
  onAccept: (files: File[]) => void;
  buttonLabel?: string;
  multiple?: boolean;
  rule?: FileValidationRule;
  variant?: 'outlined' | 'contained' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
  startIcon?: React.ReactNode;
  className?: string;
  sx?: any;
  resetOnSelect?: boolean;
  hideErrors?: boolean;
}

const defaultRule: FileValidationRule = {
  maxSizeBytes: 8*1024*1024,
  allowedTypePrefixes: ['image/','text/','application/pdf']
};

export const ValidatedFileInput: React.FC<ValidatedFileInputProps> = ({
  onAccept,
  buttonLabel='Upload',
  multiple=true,
  rule=defaultRule,
  variant='outlined',
  size='small',
  color='primary',
  startIcon,
  className,
  sx,
  resetOnSelect=true,
  hideErrors=false
}) => {
  const inputRef = React.useRef<HTMLInputElement|null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const open = () => inputRef.current?.click();
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Copied, not referenced. This worked only because the reset below happened
    // last; a live FileList is emptied by clearing value, so moving that line up
    // or putting an await above it would have broken uploads silently.
    const files = Array.from(e.target.files ?? []);
    if(resetOnSelect && e.target) e.target.value='';

    setErrors([]);
    if(files.length){
      const { accepted, rejected } = validateFiles(files, rule);
      if(rejected.length) setErrors(rejected.flatMap(r=> r.errors));
      if(accepted.length) onAccept(accepted);
    }
  };
  return (
    <Box className={className} sx={{ display:'flex', flexDirection:'column', gap:1, ...sx }}>
      <input ref={inputRef} type='file' hidden multiple={multiple} onChange={onChange} />
      <Button variant={variant} size={size} color={color} startIcon={startIcon as any} onClick={open} sx={{ textTransform:'none' }}>{buttonLabel}</Button>
      {!hideErrors && errors.length>0 && (
        <Box sx={{ border:'1px solid', borderColor:'error.light', background:(t)=> t.palette.mode==='dark'? '#2a1818':'#fff5f5', p:1, borderRadius:1.5 }}>
          <Typography variant='caption' sx={{ fontWeight:700, color:'error.main', display:'flex', alignItems:'center', gap:.5 }}><WarningAmberOutlinedIcon fontSize='inherit' />Upload issues:</Typography>
          {errors.map((er,i)=>(<Typography key={i} variant='caption' sx={{ display:'block', color:'error.main' }}>• {er}</Typography>))}
        </Box>
      )}
    </Box>
  );
};

export default ValidatedFileInput;