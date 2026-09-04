import React from 'react';
import { BRAND } from '../../theme';
import {
  Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, LinearProgress, Typography, useTheme,
} from '@mui/material';
import { IconArrowRight, IconUsersPlus, IconChartPie2, IconScale } from '@tabler/icons-react';
import type { PlannerExpense } from '../../store/plannerSlice';

/**
 * Group expense intelligence: who paid, who owes, and how to settle with the
 * fewest transfers - plus a category breakdown of overall spend.
 * Pure client-side math over the planner's expense list.
 */

export interface ExpenseMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface MemberBalance extends ExpenseMember {
  /** Total this member paid on split expenses */
  paid: number;
  /** This member's fair share of split expenses */
  share: number;
  /** paid - share; positive = gets money back */
  net: number;
}

export interface Settlement {
  from: ExpenseMember;
  to: ExpenseMember;
  amount: number;
}

/** Resolve the legacy 'me' payer sentinel to the current user's id. */
const resolvePayer = (paidBy: string | undefined, myUserId: string): string =>
  !paidBy || paidBy === 'me' ? myUserId : String(paidBy);

export function computeBalances(
  expenses: PlannerExpense[],
  members: ExpenseMember[],
  myUserId: string,
): { balances: MemberBalance[]; splitTotal: number; unsplitTotal: number } {
  const byId = new Map(members.map((m) => [String(m.id), m]));
  const balances = new Map<string, MemberBalance>(
    members.map((m) => [String(m.id), { ...m, id: String(m.id), paid: 0, share: 0, net: 0 }]),
  );
  let splitTotal = 0;
  let unsplitTotal = 0;

  for (const e of expenses) {
    if (e.splitStrategy !== 'equal' || members.length < 2) {
      unsplitTotal += e.amount;
      continue;
    }
    splitTotal += e.amount;
    const payerId = resolvePayer(e.paidByUserId, myUserId);
    // Payments by someone no longer in the group still count toward everyone's share,
    // but can't be settled - attribute them to the closest known member if possible.
    const payer = balances.get(payerId) ?? (byId.has(payerId) ? balances.get(payerId) : undefined);
    if (payer) payer.paid += e.amount;
    const perHead = e.amount / members.length;
    balances.forEach((b) => {
      b.share += perHead;
    });
  }

  balances.forEach((b) => {
    b.net = Math.round((b.paid - b.share) * 100) / 100;
  });

  return { balances: Array.from(balances.values()), splitTotal, unsplitTotal };
}

/** Greedy min-cash-flow settlement: largest debtor pays largest creditor first. */
export function computeSettlements(balances: MemberBalance[]): Settlement[] {
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b })).sort((a, b) => b.net - a.net);
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b })).sort((a, b) => a.net - b.net);
  const out: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.net, -debt.net);
    if (amount > 0.005) {
      out.push({ from: debt, to: credit, amount: Math.round(amount * 100) / 100 });
    }
    credit.net -= amount;
    debt.net += amount;
    if (credit.net <= 0.005) ci++;
    if (debt.net >= -0.005) di++;
  }
  return out;
}

// ── Group Balances dialog ─────────────────────────────────────────────────

interface GroupBalancesDialogProps {
  open: boolean;
  onClose: () => void;
  expenses: PlannerExpense[];
  members: ExpenseMember[];
  myUserId: string;
  currencySymbol: string;
  onInvite?: () => void;
}

export const GroupBalancesDialog: React.FC<GroupBalancesDialogProps> = ({
  open, onClose, expenses, members, myUserId, currencySymbol: cur, onInvite,
}) => {
  const theme = useTheme();
  const { balances, splitTotal } = React.useMemo(
    () => computeBalances(expenses, members, myUserId),
    [expenses, members, myUserId],
  );
  const settlements = React.useMemo(() => computeSettlements(balances), [balances]);
  const maxAbs = Math.max(0.01, ...balances.map((b) => Math.abs(b.net)));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconScale size={20} color={theme.palette.primary.main} />
        Group balances
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {members.length < 2 ? (
          <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '18px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: theme.custom.gradients.brandSubtle,
              }}
            >
              <IconUsersPlus size={26} color={theme.palette.primary.main} />
            </Box>
            <Typography sx={{ fontWeight: 700 }}>It's just you so far</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320 }}>
              Invite your travel crew and every shared expense will be split automatically - we'll track who owes whom.
            </Typography>
            {onInvite && (
              <Button variant="contained" size="small" onClick={() => { onClose(); onInvite(); }} sx={{ mt: 1 }}>
                Invite travelers
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {cur}{splitTotal.toFixed(2)} in shared expenses, split equally between {members.length} travelers.
            </Typography>

            {/* Per-member nets */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {balances.map((b) => {
                const gets = b.net > 0.005;
                const owes = b.net < -0.005;
                const barColor = gets ? theme.palette.success.main : owes ? theme.palette.error.main : theme.palette.text.disabled;
                return (
                  <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar src={b.avatarUrl || undefined} sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
                      {b.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }} noWrap>
                          {b.id === myUserId ? `${b.name} (you)` : b.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: barColor, flexShrink: 0, ml: 1 }}>
                          {gets ? `gets back ${cur}${b.net.toFixed(2)}` : owes ? `owes ${cur}${Math.abs(b.net).toFixed(2)}` : 'settled'}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(Math.abs(b.net) / maxAbs) * 100}
                        sx={{ mt: 0.5, height: 5, '& .MuiLinearProgress-bar': { backgroundColor: barColor } }}
                      />
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.25 }}>
                        paid {cur}{b.paid.toFixed(2)} · fair share {cur}{b.share.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Settle up plan */}
            {settlements.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
                    Settle up ,{settlements.length} transfer{settlements.length === 1 ? '' : 's'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {settlements.map((s, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                          borderRadius: '12px', border: `1px solid ${theme.custom.surface.border}`,
                          background: theme.custom.surface.hover,
                        }}
                      >
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }} noWrap>
                          {s.from.id === myUserId ? 'You' : s.from.name}
                        </Typography>
                        <IconArrowRight size={14} color={theme.palette.text.disabled} style={{ flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }} noWrap>
                          {s.to.id === myUserId ? 'you' : s.to.name}
                        </Typography>
                        <Chip size="small" label={`${cur}${s.amount.toFixed(2)}`} sx={{ fontWeight: 700 }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}
            {settlements.length === 0 && splitTotal > 0 && (
              <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, textAlign: 'center' }}>
                All settled - nobody owes anything.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Spend breakdown dialog ────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Flights: '#0EA5E9',
  Stay: '#8B5CF6',
  Food: '#F59E0B',
  Transport: '#10B981',
  Activity: BRAND.coral,
  Misc: '#6B7280',
};

interface SpendBreakdownDialogProps {
  open: boolean;
  onClose: () => void;
  expenses: PlannerExpense[];
  tripBudget?: number;
  currencySymbol: string;
}

export const SpendBreakdownDialog: React.FC<SpendBreakdownDialogProps> = ({
  open, onClose, expenses, tripBudget, currencySymbol: cur,
}) => {
  const theme = useTheme();
  const total = expenses.reduce((a, c) => a + c.amount, 0);

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category || 'Misc';
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, total]);

  const topItems = React.useMemo(
    () => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3),
    [expenses],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconChartPie2 size={20} color={theme.palette.primary.main} />
        Spend breakdown
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {cur}{total.toFixed(2)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            total spent{tripBudget != null ? ` of ${cur}${tripBudget.toFixed(2)} budget (${tripBudget > 0 ? Math.round((total / tripBudget) * 100) : 0}%)` : ''}
          </Typography>
        </Box>

        {/* Stacked category bar */}
        {total > 0 && (
          <Box sx={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: '2px' }}>
            {byCategory.map((c) => (
              <Box
                key={c.category}
                sx={{ width: `${c.pct}%`, minWidth: 4, background: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Misc }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {byCategory.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Add expenses to see where the money goes.
            </Typography>
          )}
          {byCategory.map((c) => (
            <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', background: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Misc, flexShrink: 0 }} />
              <Typography sx={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{c.category}</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{Math.round(c.pct)}%</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 72, textAlign: 'right' }}>
                {cur}{c.amount.toFixed(2)}
              </Typography>
            </Box>
          ))}
        </Box>

        {topItems.length > 0 && (
          <>
            <Divider />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 0.75, color: 'text.secondary' }}>
                Biggest line items
              </Typography>
              {topItems.map((e) => (
                <Box key={e.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
                  <Typography sx={{ fontSize: '0.82rem' }} noWrap>
                    {e.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, ml: 2, flexShrink: 0 }}>
                    {cur}{e.amount.toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
