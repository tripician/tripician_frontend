import React from 'react';
import { Box, Button, LinearProgress, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { IconWallet, IconPencil } from '@tabler/icons-react';
import { BRAND } from '../../../theme';
import SectionShell from './SectionShell';

interface ShowcaseExpense {
  id?: string;
  label?: string;
  category?: string;
  amount: number;
  date?: string;
}

function normaliseExpenses(rawTrip: any): ShowcaseExpense[] {
  const list: any[] = Array.isArray(rawTrip?.expenses) ? rawTrip.expenses
    : Array.isArray(rawTrip?.Expenses) ? rawTrip.Expenses : [];
  return list
    .map((e: any) => ({
      id: e?.id ? String(e.id) : undefined,
      label: typeof e?.label === 'string' && e.label.trim() ? e.label.trim() : undefined,
      category: typeof e?.category === 'string' && e.category.trim() ? e.category.trim() : 'Other',
      amount: Number(e?.amount) || 0,
      date: e?.date || e?.createdAt || undefined,
    }))
    .filter((e) => e.amount > 0);
}

interface BudgetSectionProps {
  rawTrip: any;
  currencyCode: string;
  canEdit: boolean;
  onEdit?: () => void;
}

const BudgetSection: React.FC<BudgetSectionProps> = ({ rawTrip, currencyCode, canEdit, onEdit }) => {
  const theme = useTheme();
  const border = theme.custom.surface.border;

  const expenses = React.useMemo(() => normaliseExpenses(rawTrip), [rawTrip]);
  const budget = Number(rawTrip?.budget ?? rawTrip?.Budget) || 0;
  const spent = expenses.reduce((a, e) => a + e.amount, 0);

  const money = React.useCallback(
    (n: number) => new Intl.NumberFormat(undefined, {
      style: 'currency', currency: currencyCode, maximumFractionDigits: 0,
    }).format(n),
    [currencyCode],
  );

  const byCategory = React.useMemo(() => {
    const sums = new Map<string, number>();
    for (const e of expenses) sums.set(e.category!, (sums.get(e.category!) ?? 0) + e.amount);
    return Array.from(sums.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const editAction = canEdit && onEdit ? (
    <Button
      size="small"
      onClick={onEdit}
      startIcon={<IconPencil size={15} />}
      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '50px' }}
    >
      Open in planner
    </Button>
  ) : undefined;

  if (budget <= 0 && expenses.length === 0) {
    return (
      <SectionShell
        icon={<IconWallet size={20} style={{ color: BRAND.coral }} />}
        title="Budget"
        membersOnly
        action={editAction}
        empty={canEdit
          ? 'No budget set and nothing logged yet. Set a budget and add expenses in the planner.'
          : 'Nobody has logged an expense for this trip yet.'}
      />
    );
  }

  const overBudget = budget > 0 && spent > budget;
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const maxCategory = byCategory[0]?.amount ?? 0;

  return (
    <SectionShell
      icon={<IconWallet size={20} style={{ color: BRAND.coral }} />}
      title="Budget"
      membersOnly
      action={editAction}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'minmax(0,420px) minmax(0,1fr)' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>

        <Box sx={{ borderRadius: '18px', border: `1px solid ${border}`, bgcolor: 'background.paper', boxShadow: theme.custom.shadows.card, p: 2.5 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.75 }}>
            Logged so far
          </Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
            {money(spent)}
          </Typography>

          {budget > 0 && (
            <>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 7, borderRadius: 4, mt: 2, mb: 1, bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: overBudget ? '#dc2626' : 'primary.main' },
                }}
              />
              <Typography sx={{ fontSize: 13, color: overBudget ? '#dc2626' : 'text.secondary', fontWeight: overBudget ? 700 : 500 }}>
                {overBudget
                  ? `${money(spent - budget)} over the ${money(budget)} budget`
                  : `${money(Math.max(0, budget - spent))} left of ${money(budget)}`}
              </Typography>
            </>
          )}

          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: budget > 0 ? 1.5 : 2 }}>
            {expenses.length === 1 ? '1 expense logged' : `${expenses.length} expenses logged`}
            {canEdit ? '. Splitting up who owes what happens in the planner.' : '.'}
          </Typography>
        </Box>

        {byCategory.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.disabled', mb: 1.5 }}>
              Where it went
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
              {byCategory.map((c) => (
                <Box key={c.name}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', flex: 1, minWidth: 0 }}>
                      {c.name}
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.secondary' }}>
                      {money(c.amount)}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: `${maxCategory ? (c.amount / maxCategory) * 100 : 0}%`,
                      borderRadius: 3,
                      bgcolor: alpha(BRAND.coral, 0.75),
                    }} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </SectionShell>
  );
};

export default BudgetSection;
