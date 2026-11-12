import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';

import { renderInline } from './markdown';
import { parseRichAnswer, type CalloutTone, type RichBlock, type RichItem } from './richAnswer';

/**
 * A Tripician Intelligence answer, decorated: an "at a glance" chip strip, the
 * days of a plan on a timeline, callouts for tips, warnings and weather, and
 * emoji in place of bullets. `richAnswer.ts` reads the syntax; older answers and
 * plain Markdown still come out readable. Never renders HTML.
 */
const DecoratedAnswer: React.FC<{ content: string; streaming?: boolean }> = ({ content, streaming }) => {
  const blocks = React.useMemo(() => parseRichAnswer(content), [content]);

  if (!blocks.length) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {blocks.map((block, index) => (
        <Block
          key={`${block.kind}:${index}`}
          block={block}
          index={index}
          continues={block.kind === 'day' && blocks[index + 1]?.kind === 'day'}
        />
      ))}
      {streaming && (
        <span className="tripicianai-cursor" aria-hidden style={{ fontWeight: 500 }}>
          ▋
        </span>
      )}
    </Box>
  );
};

const Inline: React.FC<{ text: string; id: string }> = ({ text, id }) => <>{renderInline(text, id)}</>;

const Block: React.FC<{ block: RichBlock; index: number; continues: boolean }> = ({ block, index, continues }) => {
  const id = `b${index}`;
  switch (block.kind) {
    case 'glance':
      return (
        <Box sx={(t) => ({ borderRadius: '14px', px: 1.5, pt: 1.25, pb: 1.5, bgcolor: alpha(t.palette.primary.main, 0.08) })}>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.6, display: 'block' }}>
            At a glance
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
            {block.items.map((item, i) => (
              <Box
                key={`${item}:${i}`}
                component="span"
                sx={{
                  px: 1.25,
                  py: 0.4,
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                <Inline text={item} id={`${id}-g${i}`} />
              </Box>
            ))}
          </Box>
        </Box>
      );

    case 'day':
      return <DayCard block={block} id={id} continues={continues} />;

    case 'heading':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: index === 0 ? 0 : 0.75 }}>
          <Box aria-hidden sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
          <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, m: 0 }}>
            <Inline text={block.text} id={id} />
          </Typography>
        </Box>
      );

    case 'callout':
      return <Callout tone={block.tone} icon={block.icon} text={block.text} id={id} />;

    case 'list':
      return (
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          {block.items.map((item, i) => (
            <ItemRow key={i} item={item} id={`${id}-${i}`} />
          ))}
        </Box>
      );

    case 'paragraph':
      return (
        <Box component="p" sx={{ m: 0 }}>
          <Inline text={block.text} id={id} />
        </Box>
      );
  }
};

const DayCard: React.FC<{ block: Extract<RichBlock, { kind: 'day' }>; id: string; continues: boolean }> = ({
  block,
  id,
  continues,
}) => {
  const number = block.label.replace(/^days?\s*/i, '');
  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Box aria-hidden sx={{ width: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: number.length > 2 ? '0.62rem' : '0.8rem',
            fontWeight: 700,
          }}
        >
          {number}
        </Box>
        {continues && (
          <Box sx={(t) => ({ flex: 1, width: 2, mt: 0.5, mb: -1.25, borderRadius: 1, bgcolor: alpha(t.palette.primary.main, 0.18) })} />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pt: '2px', pb: continues ? 0.75 : 0 }}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.4, display: 'block' }}>
          {block.label}
        </Typography>
        {block.title && (
          <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, m: 0 }}>
            <Inline text={block.title} id={`${id}-t`} />
          </Typography>
        )}
        {block.items.length > 0 && (
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            {block.items.map((item, i) => (
              <ItemRow key={i} item={item} id={`${id}-${i}`} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const ItemRow: React.FC<{ item: RichItem; id: string }> = ({ item, id }) => (
  <Box component="li" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
    {item.number ? (
      <Box component="span" sx={{ minWidth: 20, textAlign: 'right', fontWeight: 600 }}>
        {item.number}
      </Box>
    ) : item.emoji ? (
      <Box component="span" aria-hidden sx={{ minWidth: 22, textAlign: 'center' }}>
        {item.emoji}
      </Box>
    ) : (
      <Box
        component="span"
        aria-hidden
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', mt: '0.6em', mx: '7px', flexShrink: 0 }}
      />
    )}
    <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
      {item.number && item.emoji ? `${item.emoji} ` : null}
      <Inline text={item.text} id={id} />
    </Box>
  </Box>
);

const CALLOUT_ICON: Record<CalloutTone, string> = { tip: '💡', warning: '⚠️', weather: '🌤️', note: '📌' };

function calloutColour(t: Theme, tone: CalloutTone): string {
  if (tone === 'tip') return t.palette.primary.main;
  if (tone === 'warning') return t.palette.warning.main;
  if (tone === 'weather') return t.palette.info.main;
  return t.palette.text.disabled;
}

const Callout: React.FC<{ tone: CalloutTone; icon: string | null; text: string; id: string }> = ({ tone, icon, text, id }) => {
  const theme = useTheme();
  const colour = calloutColour(theme, tone);
  return (
    <Box
      role={tone === 'warning' ? 'note' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        borderRadius: '12px',
        borderLeft: `3px solid ${colour}`,
        bgcolor: alpha(colour, theme.palette.mode === 'light' ? 0.09 : 0.16),
        px: 1.5,
        py: 1.1,
        fontSize: '0.92em',
      }}
    >
      <Box component="span" aria-hidden>
        {icon ?? CALLOUT_ICON[tone]}
      </Box>
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
        <Inline text={text} id={id} />
      </Box>
    </Box>
  );
};

export default DecoratedAnswer;
