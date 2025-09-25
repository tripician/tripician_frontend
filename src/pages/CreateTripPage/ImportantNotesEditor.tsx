import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import HighlightIcon from '@mui/icons-material/Highlight';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';

interface ImportantNotesEditorProps {
  value?: string;           // If provided => controlled mode
  onChange?: (html: string) => void; // Fired on every content change
  compact?: boolean; // compact header inline mode
}

const MAX_CHARS = 1000;

const ImportantNotesEditor: React.FC<ImportantNotesEditorProps> = (props) => {
  const { value, onChange, compact } = props;
  const isControlled = value !== undefined; // uncontrolled if prop omitted
  const initial = (value ?? '');
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [internal, setInternal] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [charCount, setCharCount] = React.useState(() => stripHtml(initial).length);
  // Track previous prop value to detect external controlled changes
  const prevValueRef = React.useRef(value);

  // Keep internal state in sync ONLY for controlled usage when parent value changes
  React.useEffect(()=> {
    if(!isControlled) return; // skip sync for uncontrolled (prevents wiping saved content)
    if(value !== prevValueRef.current){
      prevValueRef.current = value;
      if(!editing){
        const next = value ?? '';
        setInternal(next);
        setSaved(next);
        if(ref.current && ref.current.innerHTML !== next) ref.current.innerHTML = next;
        setCharCount(stripHtml(next).length);
      }
    }
  }, [value, editing, isControlled]);

  const exec = (command: string, valueArg?: string) => {
    // Preserve selection inside editor only
    if(!ref.current) return;
    ref.current.focus();
    document.execCommand(command, false, valueArg);
    handleInput();
  };

  const handleInput = () => {
    if(!ref.current) return;
    // Enforce character limit on plain text content (excluding HTML tags)
    let html = ref.current.innerHTML || '';
    const text = stripHtml(html);
    if(text.length > MAX_CHARS) {
      const truncated = text.slice(0, MAX_CHARS);
      // Simple re-wrap truncated plain text inside a div; drop formatting beyond limit
      html = escapeHtml(truncated).replace(/\n/g,'<br>');
      ref.current.innerHTML = html;
      placeCursorAtEnd(ref.current);
    }
    setCharCount(stripHtml(html).length);
    setInternal(html);
    onChange?.(html);
  };

  const changeFontSize = (delta: number) => {
    if(!ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Wrap selection in span if necessary
    if(range.collapsed) return; // do nothing for collapsed selection
    const span = document.createElement('span');
    span.appendChild(range.extractContents());
    // Determine new size relative to average size (fallback 14)
    const base =  parseInt(window.getComputedStyle(span).fontSize || '14',10);
    const next = Math.max(10, Math.min(42, base + delta));
    span.style.fontSize = next + 'px';
    range.insertNode(span);
    // Move cursor after span
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.collapse(true);
    sel.addRange(newRange);
    handleInput();
  };

  const highlight = () => exec('backColor', '#FFF59D');

  // Helper utilities
  function stripHtml(html: string){
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  function escapeHtml(str:string){
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // Keep DOM innerHTML synced with internal (for compact mode where we no longer use dangerouslySetInnerHTML)
  React.useEffect(()=> {
    if(ref.current && !editing) {
      // Only update when not editing to avoid disrupting caret
      if(ref.current.innerHTML !== internal) ref.current.innerHTML = internal;
    }
  }, [internal, editing]);
  function placeCursorAtEnd(el: HTMLElement){
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if(sel){ sel.removeAllRanges(); sel.addRange(range); }
  }

  if (compact) {
    return (
      <Box
  onClick={()=> { if(!editing){ setEditing(true); if(ref.current && ref.current.innerHTML !== internal){ ref.current.innerHTML = internal; } setTimeout(()=> { ref.current?.focus(); placeCursorAtEnd(ref.current!); }, 0); } }}
        sx={(theme)=>({
          flex:1,
            minWidth:0,
            position:'relative',
            border:`1px solid ${theme.palette.divider}`,
            borderRadius:1.5,
            background: theme.palette.mode==='dark'? '#1d2731':'#f5f7f9',
            transition:'all .25s ease',
            cursor: editing? 'text':'pointer',
            display:'flex', flexDirection:'column',
            boxShadow: editing? theme.shadows[2]:'none',
            '&:hover': !editing ? { borderColor: theme.palette.primary.light } : undefined,
            overflow:'hidden'
        })}
      >
        {/* Toolbar (shows only while editing) */}
        <Box sx={(theme)=>({
          height: editing? 36:0,
          opacity: editing? 1:0,
          pointerEvents: editing? 'auto':'none',
          display:'flex', alignItems:'center', gap:.5,
          px:1, py:.5,
          borderBottom: editing? `1px solid ${theme.palette.divider}`:'none',
          background: theme.palette.action.hover,
          transition:'all .2s ease'
        })} onMouseDown={(e)=> e.stopPropagation()}>
          <Tooltip title='Bold'><span><IconButton size='small' onClick={()=> exec('bold')}><FormatBoldIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Italic'><span><IconButton size='small' onClick={()=> exec('italic')}><FormatItalicIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Highlight'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); highlight(); }}><HighlightIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Bullet list'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); exec('insertUnorderedList'); }}><FormatListBulletedIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Numbered list'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); exec('insertOrderedList'); }}><FormatListNumberedIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Insert link'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); const url = prompt('Enter URL'); if(url){ let u=url.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; exec('createLink', u); } }}><LinkIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Increase font size'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); changeFontSize(2); }}><TextIncreaseIcon fontSize='small' /></IconButton></span></Tooltip>
          <Tooltip title='Decrease font size'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); changeFontSize(-2); }}><TextDecreaseIcon fontSize='small' /></IconButton></span></Tooltip>
          <Box sx={{ flexGrow:1 }} />
          <Tooltip title='Cancel (Esc)'><span><IconButton size='small' onClick={(e)=> { e.stopPropagation(); setInternal(saved); if(ref.current) ref.current.innerHTML = saved; setEditing(false); }}>✕</IconButton></span></Tooltip>
          <Tooltip title='Save (Enter)'><span><IconButton color='primary' size='small' onClick={(e)=> { e.stopPropagation(); setSaved(internal); if(isControlled){ prevValueRef.current = internal; } setEditing(false); }}>✓</IconButton></span></Tooltip>
        </Box>
        {/* Content area */}
        <Box
          ref={ref}
          dir='ltr'
          contentEditable={editing}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={(e)=> {
            if(editing && e.key==='Escape'){ e.preventDefault(); setInternal(saved); if(ref.current) ref.current.innerHTML=saved; setEditing(false); }
            if(editing && e.key==='Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); setSaved(internal); if(isControlled){ prevValueRef.current = internal; } setEditing(false); }
          }}
          sx={{ flex:1, px:1.25, py:.6, outline:'none', fontSize:13, lineHeight:1.5, overflow:'hidden', whiteSpace:'pre-wrap', wordBreak:'break-word', userSelect: editing? 'text':'none', '&:empty:before':{ content: 'attr(data-placeholder)', color:'text.secondary', opacity:.7, fontStyle:'italic' }, ...(editing? { overflowY:'auto', maxHeight:140 } : { display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }) }}
          data-placeholder='Pin your important notes here'
        />
        <Box sx={{ position:'absolute', bottom:4, right:8, fontSize:11, color:'text.secondary', background:'rgba(0,0,0,0.04)', px:.75, py:.25, borderRadius:10 }}>
          {charCount} / {MAX_CHARS}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={(theme) => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 2,
      overflow: 'hidden',
      background: theme.palette.mode === 'dark' ? theme.palette.background.default : '#fff',
      display: 'flex', flexDirection:'column'
    })}>
      <Box sx={(theme)=>({ display:'flex', alignItems:'center', gap:.5, px:1, py:.5, borderBottom:`1px solid ${theme.palette.divider}`, background: theme.palette.action.hover })}>
  <Tooltip title='Bold'><span><IconButton size='small' onClick={()=> exec('bold')}><FormatBoldIcon fontSize='small' /></IconButton></span></Tooltip>
        <Tooltip title='Italic'><span><IconButton size='small' onClick={()=> exec('italic')}><FormatItalicIcon fontSize='small' /></IconButton></span></Tooltip>
        <Tooltip title='Highlight'><span><IconButton size='small' onClick={highlight}><HighlightIcon fontSize='small' /></IconButton></span></Tooltip>
  <Tooltip title='Bullet list'><span><IconButton size='small' onClick={()=> exec('insertUnorderedList')}><FormatListBulletedIcon fontSize='small' /></IconButton></span></Tooltip>
  <Tooltip title='Numbered list'><span><IconButton size='small' onClick={()=> exec('insertOrderedList')}><FormatListNumberedIcon fontSize='small' /></IconButton></span></Tooltip>
  <Tooltip title='Insert link'><span><IconButton size='small' onClick={()=> { const url = prompt('Enter URL'); if(url){ let u=url.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; exec('createLink', u); } }}><LinkIcon fontSize='small' /></IconButton></span></Tooltip>
        <Tooltip title='Increase font size'><span><IconButton size='small' onClick={()=> changeFontSize(2)}><TextIncreaseIcon fontSize='small' /></IconButton></span></Tooltip>
        <Tooltip title='Decrease font size'><span><IconButton size='small' onClick={()=> changeFontSize(-2)}><TextDecreaseIcon fontSize='small' /></IconButton></span></Tooltip>
      </Box>
      <Box
        ref={ref}
        dir='ltr'
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={(e)=> {
          if((stripHtml(internal).length >= MAX_CHARS) && !['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Meta','Control','Alt','Shift','Escape'].includes(e.key) && !e.ctrlKey && !e.metaKey){
            e.preventDefault();
          }
        }}
        sx={{ px:1.5, py:1, minHeight:120, outline:'none', fontSize:14, lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word', '&:empty:before':{ content: 'attr(data-placeholder)', color:'text.secondary', opacity:.7, fontStyle:'italic' } }}
        data-placeholder='Pin your important notes here'
        {...{ dangerouslySetInnerHTML: { __html: internal } }}
      />
      <Box sx={{ display:'flex', justifyContent:'flex-end', px:1.25, pb:.5 }}>
        <Typography variant='caption' sx={{ opacity:.7 }}>{charCount} / {MAX_CHARS}</Typography>
      </Box>
    </Box>
  );
};

export default ImportantNotesEditor;
