import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { addDocument, removeDocument, selectDocument, togglePin, updateSearch, renameDocument, reorderDocuments } from '../../store/docsSlice';
import { useDispatch as useReduxDispatch } from 'react-redux';
import { pinDoc, unpinDoc, addGlobalDoc, removeVisaDoc, removeGlobalDoc } from '../../store/plannerSlice';
import { Box, Button, Typography, TextField, IconButton, Tooltip, Divider, Chip } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { DEFAULT_DOC_RULE, validateFiles } from '../../utils/fileValidation';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const humanSize = (bytes:number) => {
  if(bytes < 1024) return bytes + ' B';
  const units = ['KB','MB','GB'];
  let v = bytes/1024; let i=0;
  while(v>=1024 && i<units.length-1) { v/=1024; i++; }
  return v.toFixed(1)+' '+units[i];
};

const Docs: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const plannerDispatch = useReduxDispatch();
  const plannerState = useSelector((s:RootState)=> s.planner);
  const isGlobalDocExisting = (id:string) => !!plannerState.globalDocs?.some(g=> g.id===id);
  const isPinned = (id:string) => !!plannerState.pinnedDocIds?.includes(id);
  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const { docs: sliceDocs, selectedId, search } = useSelector((s:RootState)=> s.docs);
  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');
  const [errors, setErrors] = React.useState<string[]>([]);
  // Build unified docs list: existing docs slice + planner visa/global docs (avoiding id collisions by prefixing)
  const plannerVisa = (plannerState.visaDocs||[]).map(d=> ({
    id: 'visa::'+d.id,
    originalId: d.id,
    name: d.originalName,
    type: d.mimeType||'application/octet-stream',
    size: 0,
    content: d.url,
    pinned: plannerState.pinnedDocIds?.includes(d.id) || false,
    source: 'visa' as const
  }));
  const plannerGlobal = (plannerState.globalDocs||[]).map(d=> ({
    id: 'glob::'+d.id,
    originalId: d.id,
    name: d.originalName,
    type: d.mimeType||'application/octet-stream',
    size: 0,
    content: d.url,
    pinned: plannerState.pinnedDocIds?.includes(d.id) || false,
    source: 'global' as const
  }));
  const docs = React.useMemo(()=> {
    // Avoid duplicating if sliceDocs already contains a doc with same base id (rare after bridging) – prefer sliceDoc entry
    const baseIds = new Set(sliceDocs.map(d=> d.id));
    const plannerConverted = [...plannerVisa, ...plannerGlobal].filter(d=> !baseIds.has(d.originalId || ''));
    return [...sliceDocs, ...plannerConverted];
  }, [sliceDocs, plannerVisa.length, plannerGlobal.length, plannerState.pinnedDocIds]);

  const selected = docs.find(d=> d.id===selectedId);
  const filtered = docs.filter(d=> !search || d.name.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(d=> d.pinned);
  const others = filtered.filter(d=> !d.pinned);

  const handleFiles = (files: FileList | null) => {
    if(!files) return;
    const duplicateNames = new Set<string>();
    const existingNames = new Set<string>([
      ...sliceDocs.map(d=> d.name.toLowerCase()),
      ...plannerVisa.map(d=> d.name.toLowerCase()),
      ...plannerGlobal.map(d=> d.name.toLowerCase())
    ]);
    const newErrors: string[] = [];
    const { accepted, rejected } = validateFiles(files, DEFAULT_DOC_RULE);
    if(rejected.length) newErrors.push(...rejected.flatMap(r=> r.errors));
    accepted.forEach(file => {
      const lower = file.name.toLowerCase();
      if(existingNames.has(lower)) {
        duplicateNames.add(file.name);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if(typeof result === 'string') {
          dispatch(addDocument({ name:file.name, type:file.type || 'application/octet-stream', size:file.size, content: result }));
        }
      };
      reader.readAsDataURL(file);
    });
    if(duplicateNames.size) newErrors.push(...Array.from(duplicateNames).map(n=> `Duplicate file skipped: ${n}`));
    setErrors(newErrors);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const dragState = React.useRef<{sourceId?:string}>({});

  const onDragStart = (e: React.DragEvent, id: string) => {
    dragState.current.sourceId = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = dragState.current.sourceId;
    if(!sourceId || sourceId===targetId) return;
    // Determine insertion before/after by cursor position
    const bounding = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = bounding.top + bounding.height/2;
    const before = e.clientY < mid;
    dispatch(reorderDocuments({ sourceId, targetId, before }));
  };

  const downloadDoc = (doc: typeof docs[number], select = true) => {
    try {
      if(select) dispatch(selectDocument(doc.id));
      const fileName = doc.name || 'document';
      const content = doc.content;
      if (/^https?:\/\//i.test(content) || /^data:/i.test(content)) {
        const a = document.createElement('a'); a.href = content; a.target='_blank'; a.download=fileName; document.body.appendChild(a); a.click(); a.remove(); return;
      }
      // basic fallback: treat as plain text
      const blob = new Blob([content], { type: doc.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=fileName; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=> URL.revokeObjectURL(url), 4000);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <Box sx={{ display:'flex', height:'100%', minHeight:'calc(100vh - 80px)', p:2, gap:2 }}>
      {/* Left explorer */}
      <Box sx={{ width:340, flexShrink:0, display:'flex', flexDirection:'column', gap:1.5, border:'1px solid', borderColor:'divider', borderRadius:2, p:1.5, background:'background.paper', overflow:'hidden' }}>
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:.5 }}>
          <Typography variant='h6' fontWeight={600}>Docs</Typography>
          <Button size='small' variant='contained' onClick={triggerUpload} sx={{ textTransform:'none', borderRadius:2 }}>Upload</Button>
          <input ref={fileInputRef} type='file' multiple hidden onChange={e=> handleFiles(e.target.files)} />
        </Box>
        <TextField size='small' placeholder='Search docs...' value={search} onChange={e=> dispatch(updateSearch({ value:e.target.value }))} />
        {errors.length>0 && (
          <Box sx={{ border:'1px solid', borderColor:'error.light', background:(t)=> t.palette.mode==='light'? '#fff4f4':'#2a1111', p:1, borderRadius:1.5 }}>
            <Typography variant='caption' sx={{ display:'flex', alignItems:'flex-start', gap:.5, color:'error.main', fontWeight:600 }}><WarningAmberOutlinedIcon fontSize='inherit' />Upload issues:</Typography>
            {errors.map((er,i)=>(
              <Typography key={i} variant='caption' sx={{ display:'block', color:'error.main' }}>• {er}</Typography>
            ))}
          </Box>
        )}
        <Box sx={{ flex:1, overflowY:'auto', pr:.5 }}>
          {pinned.length>0 && (
            <Box sx={{ mb:2 }}>
              <Typography variant='caption' sx={{ fontWeight:600, opacity:.7, ml:.5, display:'flex', alignItems:'center', gap:.5 }}><PushPinIcon fontSize='inherit' />Pinned</Typography>
              <Box sx={{ mt:.5 }}>
                {pinned.map(d=> (
                  <Box key={d.id}
                       draggable
                       onDragStart={e=> onDragStart(e,d.id)}
                       onDragOver={onDragOver}
                       onDrop={e=> onDrop(e,d.id)}
                       onClick={() => dispatch(selectDocument(d.id))}
                       sx={(t)=>({ cursor:'pointer', p:1, borderRadius:1.5, display:'flex', alignItems:'center', gap:.9, background: d.id===selectedId? t.palette.action.selected:'transparent', '&:hover':{ background: t.palette.action.hover }, border:'1px solid transparent', '&:dragover':{ borderColor:t.palette.primary.main } })}>
                    <DescriptionIcon color='primary' fontSize='small' />
                    <Box sx={{ flex:1, minWidth:0 }}>
                      <Typography variant='body2' noWrap fontWeight={500}>{d.name}</Typography>
                      <Typography variant='caption' sx={{ opacity:.65 }}>{humanSize(d.size)}</Typography>
                    </Box>
                    <Tooltip title='Download'>
                      <IconButton size='small' onClick={(e)=> { e.stopPropagation(); downloadDoc(d); }} sx={{ color:'text.secondary', transition:'color .2s', '&:hover':{ color:'primary.main' } }}><DownloadIcon fontSize='inherit' /></IconButton>
                    </Tooltip>
                    <IconButton size='small' onClick={(e)=> { e.stopPropagation(); dispatch(togglePin(d.id)); if(!d.pinned){
                      if(!isGlobalDocExisting(d.id)) plannerDispatch(addGlobalDoc({ doc:{ id:d.id, originalName:d.name, mimeType:d.type, url:d.content } }));
                      if(!isPinned(d.id)) plannerDispatch(pinDoc({ docId: d.id }));
                    } else { if(isPinned(d.id)) plannerDispatch(unpinDoc({ docId: d.id })); } }} sx={{ color: d.pinned? 'primary.main':'text.secondary', transition:'color .2s', '&:hover':{ color: d.pinned? 'warning.main':'primary.main' } }}><PushPinIcon fontSize='inherit' /></IconButton>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my:1 }} />
            </Box>
          )}
          <Typography variant='caption' sx={{ fontWeight:600, opacity:.7, ml:.5 }}>All Documents</Typography>
          <Box sx={{ mt:.5 }}>
            {others.map(d=> (
              <Box key={d.id}
                   draggable
                   onDragStart={e=> onDragStart(e,d.id)}
                   onDragOver={onDragOver}
                   onDrop={e=> onDrop(e,d.id)}
                   onClick={() => dispatch(selectDocument(d.id))}
                   sx={(t)=>({ cursor:'pointer', p:1, borderRadius:1.5, display:'flex', alignItems:'center', gap:.9, background: d.id===selectedId? t.palette.action.selected:'transparent', '&:hover':{ background: t.palette.action.hover } })}>
                <DescriptionIcon color='action' fontSize='small' />
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Typography variant='body2' noWrap fontWeight={500}>{d.name}</Typography>
                  <Typography variant='caption' sx={{ opacity:.65 }}>{humanSize(d.size)}</Typography>
                </Box>
                <Tooltip title='Download'>
                  <IconButton size='small' onClick={(e)=> { e.stopPropagation(); downloadDoc(d); }} sx={{ color:'text.secondary', transition:'color .2s', '&:hover':{ color:'primary.main' } }}>
                    <DownloadIcon fontSize='inherit' />
                  </IconButton>
                </Tooltip>
                <Tooltip title='Pin'>
                  <IconButton size='small' onClick={(e)=> { e.stopPropagation(); dispatch(togglePin(d.id)); if(!d.pinned){
                    if(!isGlobalDocExisting(d.id)) plannerDispatch(addGlobalDoc({ doc:{ id:d.id, originalName:d.name, mimeType:d.type, url:d.content } }));
                    if(!isPinned(d.id)) plannerDispatch(pinDoc({ docId: d.id }));
                  } else { if(isPinned(d.id)) plannerDispatch(unpinDoc({ docId: d.id })); } }} sx={{ color: d.pinned? 'primary.main':'text.secondary', transition:'color .2s', '&:hover':{ color: d.pinned? 'warning.main':'primary.main' } }}>
                    {d.pinned? <PushPinIcon fontSize='inherit' /> : <PushPinOutlinedIcon fontSize='inherit' />}
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
            {others.length===0 && pinned.length===0 && (
              <Typography variant='body2' sx={{ opacity:.7, mt:2, textAlign:'center' }}>No documents yet. Upload to get started.</Typography>
            )}
          </Box>
        </Box>
      </Box>
      {/* Right preview */}
      <Box sx={{ flex:1, minWidth:0, border:'1px solid', borderColor:'divider', borderRadius:2, p:2, display:'flex', flexDirection:'column', gap:1.5, background:'background.paper' }}>
        {!selected && (
          <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:1 }}>
            <DescriptionIcon sx={{ fontSize:64, opacity:.25 }} />
            <Typography variant='body1' sx={{ opacity:.7 }}>Select or upload a document to preview</Typography>
          </Box>
        )}
        {selected && (
          <>
            <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:2 }}>
              <Box sx={{ flex:1, minWidth:0 }}>
                {!renaming && (
                  <Box sx={{ display:'flex', alignItems:'center', gap:1, minWidth:0 }}>
                    <Typography variant='h6' fontWeight={600} noWrap>{selected.name}</Typography>
                    <Tooltip title='Rename'>
                      <IconButton size='small' onClick={()=> { setRenaming(true); setRenameValue(selected.name); }}>
                        <EditOutlinedIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                {renaming && (
                  <Box component='form' onSubmit={(e)=> { e.preventDefault(); if(renameValue.trim()){ dispatch(renameDocument({ id:selected.id, name: renameValue.trim() })); setRenaming(false); } }} sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <TextField size='small' autoFocus value={renameValue} onChange={e=> setRenameValue(e.target.value)} placeholder='Document name' sx={{ maxWidth:360 }} />
                    <IconButton color='primary' type='submit' size='small'><CheckIcon fontSize='small' /></IconButton>
                    <IconButton size='small' onClick={()=> setRenaming(false)}><DeleteOutlineIcon fontSize='small' /></IconButton>
                  </Box>
                )}
                <Box sx={{ display:'flex', flexWrap:'wrap', gap:.75, mt:.75 }}>
                  <Chip size='small' label={humanSize(selected.size)} />
                  <Chip size='small' label={selected.type || 'unknown'} />
                  {selected.pinned && <Chip size='small' color='primary' label='Pinned' icon={<PushPinIcon />} />}
                </Box>
              </Box>
              <Box sx={{ display:'flex', gap:1 }}>
                <Tooltip title={selected.pinned? 'Unpin':'Pin'}><IconButton onClick={()=> { dispatch(togglePin(selected.id)); if(!selected.pinned){
                  if(!isGlobalDocExisting(selected.id)) plannerDispatch(addGlobalDoc({ doc:{ id:selected.id, originalName:selected.name, mimeType:selected.type, url:selected.content } }));
                  if(!isPinned(selected.id)) plannerDispatch(pinDoc({ docId: selected.id }));
                } else { if(isPinned(selected.id)) plannerDispatch(unpinDoc({ docId: selected.id })); } }}>{selected.pinned? <PushPinIcon />:<PushPinOutlinedIcon />}</IconButton></Tooltip>
                <Tooltip title='Delete'><IconButton color='error' onClick={()=> {
                  // Bridge deletion for planner-sourced docs (visa/global) or plain library docs
                  if(selected.id.startsWith('visa::')) {
                    const baseId = selected.id.replace('visa::','');
                    plannerDispatch(removeVisaDoc({ docId: baseId }));
                    // Clear selection if it was only planner sourced
                    if(sliceDocs.length) dispatch(selectDocument(sliceDocs[0].id));
                  } else if(selected.id.startsWith('glob::')) {
                    const baseId = selected.id.replace('glob::','');
                    plannerDispatch(removeGlobalDoc({ docId: baseId }));
                    if(sliceDocs.length) dispatch(selectDocument(sliceDocs[0].id));
                  } else {
                    // Normal docs slice doc. Also remove from planner global/visa if mirrored there.
                    dispatch(removeDocument(selected.id));
                    if(plannerState.globalDocs?.some(g=> g.id===selected.id)) plannerDispatch(removeGlobalDoc({ docId: selected.id }));
                    if(plannerState.visaDocs?.some(v=> v.id===selected.id)) plannerDispatch(removeVisaDoc({ docId: selected.id }));
                  }
                }}><DeleteOutlineIcon /></IconButton></Tooltip>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ flex:1, minHeight:0, overflow:'auto', background:(t)=> t.palette.mode==='light'? '#fafafa':'#1e1e1e', borderRadius:1.5, p:2, fontFamily:'monospace', fontSize:14 }}>
              {selected.type.startsWith('image/') && (
                <img src={selected.content} alt={selected.name} style={{ maxWidth:'100%', height:'auto', display:'block' }} />
              )}
              {selected.type.startsWith('text/') && (
                <iframe title='text-preview' style={{ border:'none', width:'100%', minHeight:'60vh' }} src={selected.content}></iframe>
              )}
              {selected.type==='application/pdf' && (
                <iframe title='pdf-preview' style={{ border:'none', width:'100%', minHeight:'70vh' }} src={selected.content}></iframe>
              )}
              {!selected.type.startsWith('image/') && !selected.type.startsWith('text/') && selected.type!=='application/pdf' && (
                <Typography variant='body2' sx={{ opacity:.75 }}>Preview not supported for this file type.</Typography>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default Docs;