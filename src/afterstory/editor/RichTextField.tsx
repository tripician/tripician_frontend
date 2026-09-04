/**
 * The prose field.
 *
 * A contentEditable with an execCommand toolbar, the same approach as
 * ImportantNotesEditor, rather than a rich-text library. Two reasons: the
 * existing sanitizer's allowlist (b, strong, i, em, u, s, br, div, span, p, ul,
 * ol, li, font) is already exactly the set a story paragraph needs, so a
 * library's richer output would only be thrown away on save; and adding a
 * ProseMirror-class dependency for that is a lot of bundle for no reachable
 * capability.
 *
 * The caret is the whole difficulty here. React must not re-render innerHTML
 * while someone is typing into it, so the DOM owns the content during editing
 * and props are only pushed back in when focus is elsewhere.
 */

import React from 'react';
import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconList,
  IconListNumbers,
  IconHighlight,
} from '@tabler/icons-react';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { stripHtml } from '../blockSchema';
import { STORY_LIMITS } from '../types';

interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Prose measure from the active template, so the editor matches the reader. */
  measure?: number;
  autoFocus?: boolean;
}

const TOOLBAR = [
  { command: 'bold', label: 'Bold', Icon: IconBold },
  { command: 'italic', label: 'Italic', Icon: IconItalic },
  { command: 'underline', label: 'Underline', Icon: IconUnderline },
  { command: 'strikeThrough', label: 'Strikethrough', Icon: IconStrikethrough },
  { command: 'insertUnorderedList', label: 'Bulleted list', Icon: IconList },
  { command: 'insertOrderedList', label: 'Numbered list', Icon: IconListNumbers },
] as const;

const RichTextField: React.FC<RichTextFieldProps> = ({
  value,
  onChange,
  placeholder = 'Write what happened.',
  measure = 68,
  autoFocus,
}) => {
  const theme = useTheme();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [charCount, setCharCount] = React.useState(() => stripHtml(value).length);

  // Only sync from props while the field is not being typed into. Writing
  // innerHTML under a live caret sends it to the start of the block, which is
  // the classic contentEditable bug and is maddening to type through.
  React.useEffect(() => {
    if (focused) return;
    const node = ref.current;
    if (!node) return;
    const next = sanitizeHtml(value ?? '');
    if (node.innerHTML !== next) node.innerHTML = next;
    setCharCount(stripHtml(next).length);
  }, [value, focused]);

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleInput = React.useCallback(() => {
    const node = ref.current;
    if (!node) return;

    const html = node.innerHTML ?? '';
    const text = stripHtml(html);

    // Over the cap, the last edit is refused rather than the text being
    // truncated: silently deleting what someone just typed is worse than
    // refusing to accept more of it.
    if (text.length > STORY_LIMITS.maxTextBlockChars) {
      node.innerHTML = sanitizeHtml(value);
      placeCaretAtEnd(node);
      return;
    }

    setCharCount(text.length);
    onChange(html);
  }, [onChange, value]);

  const exec = (command: string, arg?: string) => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  /**
   * Pasting from a website is how hostile markup gets into a story, and it is
   * also how a wall of foreign fonts and colours gets in. Both are solved by
   * taking the plain text and nothing else.
   */
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  const isEmpty = charCount === 0;
  const nearLimit = charCount > STORY_LIMITS.maxTextBlockChars * 0.9;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          gap: 0.25,
          mb: 0.75,
          opacity: focused ? 1 : 0,
          pointerEvents: focused ? 'auto' : 'none',
          transition: `opacity ${theme.custom.motion.duration.fast} ${theme.custom.motion.easing.standard}`,
        }}
      >
        {TOOLBAR.map(({ command, label, Icon }) => (
          <Tooltip key={command} title={label}>
            <IconButton
              size="small"
              aria-label={label}
              // The field loses focus on mousedown otherwise, and execCommand
              // needs the selection still alive to act on.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(command)}
              sx={{ width: 28, height: 28, color: 'text.secondary' }}
            >
              <Icon size={15} />
            </IconButton>
          </Tooltip>
        ))}
        <Tooltip title="Highlight">
          <IconButton
            size="small"
            aria-label="Highlight"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec('backColor', '#FFF59D')}
            sx={{ width: 28, height: 28, color: 'text.secondary' }}
          >
            <IconHighlight size={15} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ position: 'relative' }}>
        {isEmpty && !focused && (
          <Typography
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              color: 'text.disabled',
              fontSize: { xs: '1.0625rem', md: '1.125rem' },
              lineHeight: 1.75,
            }}
          >
            {placeholder}
          </Typography>
        )}

        <Box
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Story text"
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            handleInput();
          }}
          sx={{
            outline: 'none',
            minHeight: 28,
            maxWidth: `${measure}ch`,
            color: 'text.primary',
            fontSize: { xs: '1.0625rem', md: '1.125rem' },
            lineHeight: 1.75,
            '& p': { margin: 0, marginBottom: 2 },
            '& p:last-child': { marginBottom: 0 },
            '& ul, & ol': { paddingLeft: 3, marginBottom: 2 },
            '&:focus-visible': { outline: 'none' },
          }}
        />
      </Box>

      {nearLimit && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
          {charCount.toLocaleString()} of {STORY_LIMITS.maxTextBlockChars.toLocaleString()} characters. Start a new
          text block to keep writing.
        </Typography>
      )}
    </Box>
  );
};

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export default RichTextField;
