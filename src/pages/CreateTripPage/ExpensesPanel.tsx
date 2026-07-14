// ExpensesPanel - authoritative implementation. Feature visibility is gated at the parent tab.
// To temporarily hide this feature, disable/hide its tab in the parent component – do NOT edit or strip this file.
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Paper, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider, Chip, Tooltip, InputAdornment, ToggleButtonGroup, ToggleButton, Collapse } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SortIcon from '@mui/icons-material/Sort';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { type RootState, type AppDispatch } from '../../store';
import { setTripBudget, addExpense, updateExpense, removeExpense, setSimplifyGroupExpenses, addExpenseVisibilityEmail, removeExpenseVisibilityEmail, clearExpenseVisibilityEmails } from '../../store/plannerSlice';
import { GroupBalancesDialog, SpendBreakdownDialog, type ExpenseMember } from './ExpenseInsights';

const EXPENSE_CATEGORIES = ['Flights','Stay','Food','Transport','Activity','Misc'];
type SortMode = 'newest'|'oldest'|'amount_desc'|'amount_asc';
const currencySymbol = (c: string) => c==='EUR' ? '€' : c==='USD' ? '$' : c==='GBP' ? '£' : '$';

interface ExpensesPanelProps {
  readOnly?: boolean;
  /** Trip members for payer selection & balance math */
  members?: ExpenseMember[];
  /** Current user's id (string form) ,maps the legacy 'me' payer sentinel */
  myUserId?: string | null;
  /** Opens the trip share/invite flow (used by the empty balances state) */
  onInvite?: () => void;
}
const ExpensesPanel: React.FC<ExpensesPanelProps> = ({ readOnly=false, members=[], myUserId=null, onInvite }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currency, expenses = [], tripBudget } = useSelector((s:RootState)=> s.planner);
  const [sort, setSort] = React.useState<SortMode>('newest');
  const [setBudgetOpen, setSetBudgetOpen] = React.useState(false);
  const [expenseOpen, setExpenseOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string|null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [balancesOpen, setBalancesOpen] = React.useState(false);
  const [breakdownOpen, setBreakdownOpen] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState(tripBudget?.toString()||'');

  const myId = myUserId != null ? String(myUserId) : 'me';
  const memberById = React.useMemo(()=> new Map(members.map(m=> [String(m.id), m])), [members]);
  const payerName = React.useCallback((paidBy?: string)=> {
    const id = !paidBy || paidBy==='me' ? myId : String(paidBy);
    if(id===myId) return 'You';
    return memberById.get(id)?.name || 'Member';
  }, [myId, memberById]);

  const blankExpense = { label:'', category:'Flights', amount:'', note:'', date: new Date().toISOString().slice(0,10), paidByUserId:'me', splitStrategy:'none' as 'none'|'equal'|'custom' };
  const [expenseForm, setExpenseForm] = React.useState<{ label:string; category:string; amount:string; note?:string; date:string; paidByUserId:string; splitStrategy:'none'|'equal'|'custom' }>(blankExpense);
  const [itemExpanded, setItemExpanded] = React.useState(false);
  const [dateExpanded, setDateExpanded] = React.useState(false);

  React.useEffect(()=> { if(tripBudget!=null) setBudgetInput(tripBudget.toString()); }, [tripBudget]);

  const totalSpent = expenses.reduce((a,c)=> a + c.amount, 0);
  const remaining = tripBudget!=null ? tripBudget - totalSpent : undefined;
  const cur = currencySymbol(currency);

  const sortedExpenses = React.useMemo(()=> {
    const arr = [...expenses];
    switch(sort){
      case 'newest': return arr.sort((a,b)=> b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      case 'oldest': return arr.sort((a,b)=> a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
      case 'amount_desc': return arr.sort((a,b)=> b.amount - a.amount);
      case 'amount_asc': return arr.sort((a,b)=> a.amount - b.amount);
      default: return arr;
    }
  }, [expenses, sort]);

  const openNewExpense = () => { setEditingId(null); setExpenseForm(blankExpense); setExpenseOpen(true); };
  const openEditExpense = (id:string) => {
    const e = expenses.find(x=> x.id===id); if(!e) return; setEditingId(id); setExpenseForm({ label:e.label, category:e.category||'Misc', amount:e.amount.toString(), note:e.note, date:e.date, paidByUserId: e.paidByUserId || 'me', splitStrategy: e.splitStrategy as any || 'none' }); setExpenseOpen(true);
  };

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    if(!isNaN(val) && val>=0){ dispatch(setTripBudget({ amount: parseFloat(val.toFixed(2)) })); setSetBudgetOpen(false); }
  };

  const handleSaveExpense = () => {
    const amt = parseFloat(expenseForm.amount);
    if(isNaN(amt) || amt <= 0) return;
    if(!expenseForm.label.trim()) return;
    const payload = { label: expenseForm.label.trim(), category: expenseForm.category, amount: parseFloat(amt.toFixed(2)), note: expenseForm.note?.trim(), date: expenseForm.date, paidByUserId: expenseForm.paidByUserId, splitStrategy: expenseForm.splitStrategy } as any;
    if(editingId){
      dispatch(updateExpense({ id: editingId, patch: payload }));
    } else {
      dispatch(addExpense({ expense: payload }));
    }
    setExpenseOpen(false); setEditingId(null); setExpenseForm(blankExpense); setItemExpanded(false); setDateExpanded(false);
  };

  const handleDeleteExpense = (id:string) => dispatch(removeExpense({ id }));

  const budgetColor = remaining!=null && remaining < 0 ? 'error.main' : 'text.primary';
  const remainingColor = remaining!=null ? (remaining < 0 ? 'error.main' : remaining < (tripBudget!*0.15) ? 'warning.main':'success.main') : 'text.secondary';

  return (
    <Box sx={{ p:2.25, display:'flex', flexDirection:'column', gap:2 }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:1 }}>
        <Typography variant='h6' fontWeight={700} sx={{ letterSpacing:.3 }}>Budgeting</Typography>
        {!readOnly && <Button startIcon={<AddIcon />} variant='contained' size='small' onClick={openNewExpense} sx={{ textTransform:'none', borderRadius:2 }}>Add expense</Button>}
      </Box>
      <Paper variant='outlined' sx={(t)=>({ p:2.25, borderRadius:3, display:'flex', flexDirection:'column', gap:2, background: t.palette.mode==='dark'? 'linear-gradient(145deg,#111a22,#0e1318)': 'linear-gradient(145deg,#f7f9fb,#edf1f5)' })}>
        <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
          <Box sx={{ display:'flex', flexDirection:'column', minWidth:180 }}>
            <Typography variant='h4' sx={{ fontWeight:700, lineHeight:1.2, color:budgetColor }}>
              {tripBudget!=null ? cur+tripBudget.toFixed(2) : cur+totalSpent.toFixed(2)}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mt:.5 }}>
              {tripBudget!=null ? 'Trip budget' : 'Total spent'}
            </Typography>
          </Box>
          <Box sx={{ display:'flex', gap:1.25, alignItems:'center', flexWrap:'wrap' }}>
            {!readOnly && <Button size='small' variant='contained' color='secondary' startIcon={<EditIcon />} onClick={()=> setSetBudgetOpen(true)} sx={{ borderRadius:2, textTransform:'none' }}>Set budget</Button>}
            <Button size='small' variant='outlined' startIcon={<GroupIcon />} sx={{ borderRadius:2, textTransform:'none' }} onClick={()=> setBalancesOpen(true)}>Group balances</Button>
            <Button size='small' variant='outlined' startIcon={<ReceiptLongIcon />} sx={{ borderRadius:2, textTransform:'none' }} disabled={!expenses.length} onClick={()=> setBreakdownOpen(true)}>View breakdown</Button>
            {!readOnly && <Button size='small' variant='text' startIcon={<SettingsIcon />} sx={{ borderRadius:2, textTransform:'none' }} onClick={()=> setSettingsOpen(true)}>Settings</Button>}
          </Box>
        </Box>
        <Divider />
        <Box sx={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          <Box sx={{ display:'flex', flexDirection:'column' }}>
            <Typography variant='caption' color='text.secondary'>Spent</Typography>
            <Typography variant='body1' fontWeight={600}>{cur+totalSpent.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display:'flex', flexDirection:'column' }}>
            <Typography variant='caption' color='text.secondary'>Remaining</Typography>
            <Typography variant='body1' fontWeight={600} sx={{ color: remainingColor }}>{remaining!=null? cur+remaining.toFixed(2): (tripBudget!=null? cur+(tripBudget-totalSpent).toFixed(2): '—')}</Typography>
          </Box>
          <Box sx={{ display:'flex', flexDirection:'column' }}>
            <Typography variant='caption' color='text.secondary'>Entries</Typography>
            <Typography variant='body1' fontWeight={600}>{expenses.length}</Typography>
          </Box>
        </Box>
      </Paper>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mt:.5 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <Typography variant='subtitle1' fontWeight={600}>Expenses</Typography>
          <Chip label={expenses.length} size='small' />
        </Box>
        <ToggleButtonGroup size='small' value={sort} exclusive onChange={(_,v)=> v && setSort(v)}>
          <ToggleButton value='newest'><SortIcon fontSize='small' sx={{ mr:.5 }} />New</ToggleButton>
          <ToggleButton value='oldest'>Old</ToggleButton>
          <ToggleButton value='amount_desc'>High</ToggleButton>
          <ToggleButton value='amount_asc'>Low</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Paper variant='outlined' sx={{ borderRadius:3, overflow:'hidden' }}>
        <Box sx={{ display:'flex', flexDirection:'column' }}>
          {sortedExpenses.length === 0 && (
            <Typography variant='body2' color='text.secondary' sx={{ p:2 }}>No expenses added yet.</Typography>
          )}
          <AnimatePresence initial={false}>
          {sortedExpenses.map((e, i)=> {
            const catColor = 'default';
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.03 }}
              >
              <Box sx={(t)=>({ display:'flex', alignItems:'center', gap:1.5, px:2, py:1.25, borderBottom:`1px solid ${t.palette.divider}`, '&:last-of-type':{ borderBottom:'none' } })}>
                <Box sx={{ width:34, height:34, borderRadius:'50%', bgcolor:'action.hover', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600 }}>{e.label.charAt(0).toUpperCase()}</Box>
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Typography variant='body2' fontWeight={600} noWrap>{e.label}</Typography>
                  <Box sx={{ display:'flex', gap:1, alignItems:'center', flexWrap:'wrap' }}>
                    <Chip size='small' label={e.category || 'Misc'} color={catColor as any} variant='outlined' />
                    <Typography variant='caption' color='text.secondary'>{e.date}</Typography>
                    <Typography variant='caption' color='text.secondary'>· {payerName(e.paidByUserId)} paid</Typography>
                    {e.splitStrategy==='equal' && <Chip size='small' label='split' sx={{ height:18, fontSize:10, fontWeight:700, bgcolor:'rgba(255,56,92,0.08)', color:'primary.main' }} />}
                    {e.note && <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth:160 }}>• {e.note}</Typography>}
                  </Box>
                </Box>
                <Typography variant='body2' fontWeight={700}>{cur}{e.amount.toFixed(2)}</Typography>
                {!readOnly && (
                  <>
                    <Tooltip title='Edit'>
                      <IconButton size='small' onClick={()=> openEditExpense(e.id)}><EditIcon fontSize='small' /></IconButton>
                    </Tooltip>
                    <Tooltip title='Delete'>
                      <IconButton size='small' onClick={()=> handleDeleteExpense(e.id)}><DeleteIcon fontSize='small' /></IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </Box>
      </Paper>

      {/* Set Budget Dialog */}
      {!readOnly && (
      <Dialog open={setBudgetOpen} onClose={()=> setSetBudgetOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Set Trip Budget</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:1 }}>
          <TextField
            label='Amount'
            type='number'
            inputProps={{ step:'0.01', min:0 }}
            value={budgetInput}
            onChange={e=> setBudgetInput(e.target.value)}
            InputProps={{ startAdornment:<InputAdornment position='start'>{cur}</InputAdornment> }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setSetBudgetOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveBudget} variant='contained' disabled={!budgetInput || isNaN(parseFloat(budgetInput))}>Save</Button>
        </DialogActions>
      </Dialog>
      )}

      {/* Add / Edit Expense Dialog */}
      {!readOnly && (
      <Dialog open={expenseOpen} onClose={()=> { setExpenseOpen(false); setItemExpanded(false); setDateExpanded(false); }} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ fontWeight:700 }}>{editingId? 'Edit expense':'Add expense'}</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2.25, pt:1 }}>
          <TextField
            placeholder='0'
            value={expenseForm.amount}
            type='number'
            onChange={e=> setExpenseForm(f=> ({ ...f, amount:e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <Button size='small' sx={{ minWidth:0, textTransform:'none', fontWeight:600 }}>{cur}</Button>
                </InputAdornment>
              ),
              inputProps:{ step:'0.01', min:0 }
            }}
            sx={{ '& input':{ fontSize:22, fontWeight:600 } }}
            fullWidth
          />
          <Box>
            <Paper variant='outlined' onClick={()=> setItemExpanded(o=> !o)} sx={{ cursor:'pointer', px:1.5, py:1.25, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'space-between', '&:hover':{ borderColor:'primary.main' } }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                <Typography fontSize={14} color={expenseForm.label? 'text.primary':'text.secondary'}>{expenseForm.label || 'Select item'}</Typography>
              </Box>
              <Typography variant='body2' color='text.secondary'>{itemExpanded? '▴':'▾'}</Typography>
            </Paper>
            <Collapse in={itemExpanded} unmountOnExit>
              <Box sx={{ display:'flex', gap:1.5, mt:1, flexWrap:'wrap' }}>
                <TextField label='Item name' size='small' value={expenseForm.label} onChange={e=> setExpenseForm(f=> ({ ...f, label:e.target.value }))} sx={{ flex:2, minWidth:180 }} />
                <TextField select label='Category' size='small' value={expenseForm.category} onChange={e=> setExpenseForm(f=> ({ ...f, category:e.target.value }))} sx={{ flex:1, minWidth:140 }}>
                  {EXPENSE_CATEGORIES.map(c=> <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                <TextField label='Note (optional)' size='small' value={expenseForm.note||''} onChange={e=> setExpenseForm(f=> ({ ...f, note:e.target.value }))} sx={{ flexBasis:'100%' }} multiline minRows={2} />
              </Box>
            </Collapse>
          </Box>
          <Paper variant='outlined' sx={{ px:1.5, py:1, borderRadius:2, display:'flex', flexDirection:'column', gap:.25 }}>
            <Typography variant='caption' sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:.5, opacity:.65 }}>Paid by</Typography>
            <TextField
              select
              value={expenseForm.paidByUserId}
              onChange={e=> setExpenseForm(f=> ({ ...f, paidByUserId:e.target.value }))}
              size='small'
            >
              <MenuItem value='me'>You</MenuItem>
              {members.filter(m=> String(m.id)!==myId).map(m=> (
                <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>
              ))}
            </TextField>
          </Paper>
          <Paper variant='outlined' sx={{ px:1.5, py:1, borderRadius:2, display:'flex', flexDirection:'column', gap:.25 }}>
            <Typography variant='caption' sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:.5, opacity:.65 }}>Split</Typography>
            <TextField select size='small' value={expenseForm.splitStrategy} onChange={e=> setExpenseForm(f=> ({ ...f, splitStrategy: e.target.value as any }))}>
              <MenuItem value='none'>Don't split</MenuItem>
              <MenuItem value='equal'>Split equally{members.length>1? ` between ${members.length}`:''}</MenuItem>
              <MenuItem value='custom' disabled>Custom (soon)</MenuItem>
            </TextField>
          </Paper>
          <Box>
            <Button onClick={()=> setDateExpanded(o=> !o)} size='small' variant='text' sx={{ textTransform:'none', px:0 }}>{dateExpanded? 'Hide date':'Date: Optional'}</Button>
            <Collapse in={dateExpanded} unmountOnExit>
              <TextField label='Date' type='date' size='small' value={expenseForm.date} onChange={e=> setExpenseForm(f=> ({ ...f, date:e.target.value }))} InputLabelProps={{ shrink:true }} sx={{ mt:1 }} />
            </Collapse>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2 }}>
          <Button onClick={()=> { setExpenseOpen(false); setEditingId(null); setItemExpanded(false); setDateExpanded(false); }}>Cancel</Button>
          <Button disableElevation variant='contained' onClick={handleSaveExpense} disabled={!expenseForm.amount || parseFloat(expenseForm.amount)<=0 || !expenseForm.label.trim()} sx={{ borderRadius:3, px:4 }}>
            {editingId? 'Save':'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      )}
      {/* Settings Dialog */}
      {!readOnly && <SettingsDialog open={settingsOpen} onClose={()=> setSettingsOpen(false)} />}
      {/* Insights */}
      <GroupBalancesDialog
        open={balancesOpen}
        onClose={()=> setBalancesOpen(false)}
        expenses={expenses}
        members={members}
        myUserId={myId}
        currencySymbol={cur}
        onInvite={onInvite}
      />
      <SpendBreakdownDialog
        open={breakdownOpen}
        onClose={()=> setBreakdownOpen(false)}
        expenses={expenses}
        tripBudget={tripBudget}
        currencySymbol={cur}
      />
    </Box>
  );
};

interface SettingsDialogProps { open: boolean; onClose: () => void; }
const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const simplify = useSelector((s:RootState)=> s.planner.simplifyGroupExpenses) || false;
  const visibilityEmails = useSelector((s:RootState)=> s.planner.expenseVisibilityEmails) || [];
  const expenses = useSelector((s:RootState)=> s.planner.expenses) || [];
  const currency = useSelector((s:RootState)=> s.planner.currency);
  const [emailInput, setEmailInput] = React.useState('');

  const addEmail = () => {
    const email = emailInput.trim();
    if(!email) return;
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    dispatch(addExpenseVisibilityEmail({ email }));
    setEmailInput('');
  };
  const exportCsv = () => {
    if(!expenses.length) return;
    const header = ['Label','Category','Amount ('+currency+')','Date','Note'];
    const rows = expenses.map(e=> [e.label, e.category||'', e.amount.toFixed(2), e.date, (e.note||'').replace(/"/g,'""')]);
    const csv = [header, ...rows].map(r=> r.map(f=> '"'+f+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trip-expenses.csv'; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 1500);
  };
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => { if(e.key==='Enter'){ e.preventDefault(); addEmail(); } };
  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Expense settings</DialogTitle>
      <DialogContent sx={{ display:'flex', flexDirection:'column', gap:3, pt:1 }}>
        <Box>
          <Typography variant='subtitle2'>Simplify group expenses</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb:1 }}>We'll do the math for you. Settle group expenses with fewer transactions at the end of your trip.</Typography>
          <Button variant={simplify? 'contained':'outlined'} size='small' onClick={()=> dispatch(setSimplifyGroupExpenses({ value: !simplify }))} sx={{ textTransform:'none', borderRadius:2 }}>{simplify? 'Enabled':'Enable'}</Button>
        </Box>
        <Divider />
        <Box>
          <Typography variant='subtitle2'>Expense Visibility</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb:1 }}>Only trip members and the emails you add below can view expenses.</Typography>
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mb:1 }}>
            {visibilityEmails.map(e=> <Chip key={e} label={e} onDelete={()=> dispatch(removeExpenseVisibilityEmail({ email: e }))} />)}
            {visibilityEmails.length === 0 && <Typography variant='caption' color='text.secondary'>No additional viewers yet.</Typography>}
          </Box>
          <Box sx={{ display:'flex', gap:1 }}>
            <TextField size='small' fullWidth label='Add email' value={emailInput} onChange={e=> setEmailInput(e.target.value)} onKeyDown={handleKeyDown} />
            <Button variant='contained' disabled={!emailInput.trim()} onClick={addEmail} sx={{ textTransform:'none', borderRadius:2 }}>Add</Button>
          </Box>
          {visibilityEmails.length > 0 && <Button size='small' color='error' sx={{ mt:1, textTransform:'none' }} onClick={()=> dispatch(clearExpenseVisibilityEmails())}>Clear all</Button>}
        </Box>
        <Divider />
        <Box>
          <Typography variant='subtitle2'>Export as CSV</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb:1 }}>Download your trip expenses as a CSV file.</Typography>
          <Button variant='outlined' startIcon={<ReceiptLongIcon />} disabled={!expenses.length} onClick={exportCsv} sx={{ textTransform:'none', borderRadius:2 }}>Export</Button>
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
};

export default ExpensesPanel;
