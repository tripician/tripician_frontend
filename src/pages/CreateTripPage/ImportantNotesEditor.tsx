import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import HighlightIcon from '@mui/icons-material/Highlight';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';

interface ImportantNotesEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  compact?: boolean; // compact header inline mode
}

const ImportantNotesEditor: React.FC<ImportantNotesEditorProps> = ({ value = '', onChange, compact }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [internal, setInternal] = React.useState(value);
  const [saved, setSaved] = React.useState(value);

  const exec = (command: string, valueArg?: string) => {
    document.execCommand(command, false, valueArg);
    handleInput();
  };

  const handleInput = () => {
    const html = ref.current?.innerHTML || '';
    setInternal(html);
    onChange?.(html);
  };

  const changeFontSize = (delta: number) => {
    document.execCommand('fontSize', false, '4'); // apply base size
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const el = range.startContainer.parentElement as HTMLElement;
    if (el && el.style) {
      const current = parseInt(el.style.fontSize || '16', 10);
      el.style.fontSize = Math.max(10, Math.min(42, current + delta)) + 'px';
    }
    handleInput();
  };

  const highlight = () => exec('backColor', '#FFF59D');

  if (compact) {
    return (
      <Box
        onClick={()=> { if(!editing) setEditing(true); }}
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
          <Tooltip title='Save (Enter)'><span><IconButton color='primary' size='small' onClick={(e)=> { e.stopPropagation(); setSaved(internal); setEditing(false); }}>✓</IconButton></span></Tooltip>
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
            if(editing && e.key==='Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); setSaved(internal); setEditing(false); }
          }}
          sx={{ flex:1, px:1.25, py:.6, outline:'none', fontSize:13, lineHeight:1.4, overflow:'hidden', userSelect: editing? 'text':'none', '&:empty:before':{ content: 'attr(data-placeholder)', color:'text.secondary', opacity:.7, fontStyle:'italic' }, ...(editing? { overflowY:'auto', maxHeight:140 } : { display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }) }}
          data-placeholder='Pin your important notes here'
          {...(!editing ? { dangerouslySetInnerHTML: { __html: internal } } : {})}
        />
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
        sx={{ px:1.5, py:1, minHeight:120, outline:'none', fontSize:14, lineHeight:1.5, '&:empty:before':{ content: 'attr(data-placeholder)', color:'text.secondary', opacity:.7, fontStyle:'italic' } }}
        data-placeholder='Pin your important notes here'
        {...{ dangerouslySetInnerHTML: { __html: internal } }}
      />
    </Box>
  );
};

export default ImportantNotesEditor;
