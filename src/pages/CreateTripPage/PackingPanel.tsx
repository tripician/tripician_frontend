import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { Box, Card, Typography, Chip, IconButton, TextField, InputAdornment, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BackpackOutlinedIcon from '@mui/icons-material/BackpackOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import { setActiveCategory, toggleItem, addItem, updateQuantity, addCategory, removeCategory, packingPresets } from '../../store/packingSlice';

const PackingPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, activeCategoryId } = useSelector((s:RootState)=> s.packing);
  const active = categories.find(c=> c.id===activeCategoryId) || categories[0];
  const totalItems = active?.items.length || 0;
  const completed = active?.items.filter(i=> i.checked).length || 0;
  const progress = totalItems? (completed/totalItems)*100:0;
  const globalCounts = categories.reduce((acc, c)=> { acc.total += c.items.length; acc.done += c.items.filter(i=> i.checked).length; return acc; }, { total:0, done:0 });
  const globalProgress = globalCounts.total? (globalCounts.done / globalCounts.total) * 100 : 0;
  const [newItem, setNewItem] = React.useState('');
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [filterPreset, setFilterPreset] = React.useState('');
  const [customCategoryName, setCustomCategoryName] = React.useState('');
  const handleAddItem = () => { if(newItem.trim()){ dispatch(addItem({ categoryId: active.id, name:newItem.trim() })); setNewItem(''); } };
  const openAddDialog = ()=> { setAddDialogOpen(true); setFilterPreset(''); };
  const selectPreset = (id:string)=> {
    const preset = packingPresets.find(p=> p.id===id);
    if(!preset) return;
    dispatch(addCategory({ name: preset.name }));
    // add items sequentially
    const catId = preset.name.toLowerCase().replace(/\s+/g,'-');
    preset.items.forEach(n=> dispatch(addItem({ categoryId: catId, name:n })));
    setAddDialogOpen(false);
  };
  const createCustom = ()=> { if(!customCategoryName.trim()) return; dispatch(addCategory({ name: customCategoryName.trim() })); setCustomCategoryName(''); setAddDialogOpen(false); };
  const openEditDialog = ()=> { setEditDialogOpen(true); };
  const applyEdit = ()=> { setEditDialogOpen(false); };

  return (
    <Box sx={{ display:'flex', height:'100%', gap:3 }}>
      <Box sx={{ width:380, flexShrink:0, display:'flex', flexDirection:'column', gap:2.25 }}>
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Typography variant='h6' fontWeight={600}>Packing list</Typography>
          <Box sx={{ display:'flex', gap:2 }}>
            <Tooltip title='Invite friends (future)'><Chip icon={<GroupAddOutlinedIcon fontSize='small' />} label='Invite friends' size='small' sx={{ fontWeight:500 }} /></Tooltip>
            <Button variant='contained' size='small' startIcon={<AddIcon />} onClick={openAddDialog} sx={{ textTransform:'none', borderRadius:3 }}>Add list</Button>
          </Box>
        </Box>
        <Box sx={{ height:6, borderRadius:3, background:(t)=> t.palette.divider, overflow:'hidden', position:'relative' }}>
          <Box sx={{ position:'absolute', left:0, top:0, bottom:0, width:`${globalProgress}%`, background:(t)=> t.palette.primary.main, transition:'width .35s' }} />
        </Box>
  <Box sx={{ display:'flex', gap:2, flexWrap:'wrap' }}>
          {categories.map((c, i)=> {
            const done = c.items.filter(i=> i.checked).length;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                style={{ flex: '1 1 120px', minWidth: 140 }}
              >
              <Card onClick={()=> dispatch(setActiveCategory(c.id))} sx={(t)=>({ cursor:'pointer', p:2, borderRadius:2.5, boxShadow:0, border: c.id===active.id? `2px solid ${t.palette.primary.main}`:'1px solid', borderColor: c.id===active.id? t.palette.primary.main:'divider', display:'flex', flexDirection:'column', gap:.6, transition:'all .22s', backgroundColor: t.palette.background.paper, '&:hover':{ boxShadow: c.id===active.id? 4:2 } })}>
                <Box sx={(t)=>({ width:44, height:44, borderRadius:'50%', border:'2px solid', borderColor:'divider', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:t.palette.text.secondary })}>
                  <ListAltOutlinedIcon fontSize='small' />
                </Box>
                <Typography variant='subtitle2' fontWeight={600}>{c.name}</Typography>
                <Typography variant='caption' sx={{ opacity:.55 }}>{done} / {c.items.length}</Typography>
              </Card>
              </motion.div>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:1.75 }}>
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', pr:1 }}>
          <Box sx={{ display:'flex', alignItems:'flex-start', gap:1.25 }}>
            <Box sx={(t)=>({ width:40, height:40, borderRadius:'50%', border:'2px solid', borderColor:'divider', display:'flex', alignItems:'center', justifyContent:'center', mt:.2, color:t.palette.text.secondary })}>
              {/* Simple icon heuristic based on id */}
              {active?.id==='clothing' && <CheckroomIcon fontSize='small' />}
              {active?.id==='essentials' && <Inventory2OutlinedIcon fontSize='small' />}
              {active?.id==='toiletries' && <BackpackOutlinedIcon fontSize='small' />}
              {active && !['clothing','essentials','toiletries'].includes(active.id) && <ListAltOutlinedIcon fontSize='small' />}
            </Box>
            <Box>
              <Typography variant='h6' fontWeight={600} sx={{ lineHeight:1.1 }}>{active?.name}</Typography>
              <Typography variant='caption' color='text.secondary'>List</Typography>
            </Box>
          </Box>
          <Box sx={{ flex:1, maxWidth:420, ml:3 }}>
            <Box sx={{ height:6, borderRadius:3, background:(t)=> t.palette.divider, overflow:'hidden', position:'relative', mb:1 }}>
              <Box sx={{ position:'absolute', left:0, top:0, bottom:0, width:`${progress}%`, background:(t)=> t.palette.primary.main, transition:'width .35s' }} />
            </Box>
          </Box>
          <Tooltip title='Edit list'><IconButton size='small' onClick={openEditDialog}><SettingsOutlinedIcon fontSize='small' /></IconButton></Tooltip>
        </Box>
        <Box sx={{ flex:1, overflowY:'auto', pr:0.5 }}>
          {active?.items.map(item => (
            <Box key={item.id} sx={(t)=>({
              display:'flex', alignItems:'center', gap:1.5, py:.75, borderBottom:'1px solid', borderColor:'divider',
              background:item.checked? (t.palette.mode==='light'? t.palette.grey[50]: t.palette.background.paper):'transparent',
              position:'relative',
              '& .packing-aux': { opacity:0, width:0, overflow:'hidden', transition:'all .18s', padding:0, margin:0 },
              '&:hover .packing-aux': { opacity:1, width:'auto' }
            })}>
              <IconButton size='small' onClick={()=> dispatch(toggleItem({ categoryId: active.id, itemId: item.id }))}>
                {item.checked ? <CheckCircleOutlineIcon color='primary' fontSize='small' /> : <RadioButtonUncheckedIcon fontSize='small' />}
              </IconButton>
              <Typography variant='body2' sx={{ flex:1, textDecoration: item.checked? 'line-through':'none', opacity:item.checked? .55:1, fontSize:14 }}>{item.name}</Typography>
              <Box className='packing-row-actions' sx={{ display:'flex', alignItems:'center', gap:.5 }}>
                <Tooltip title='Remove item'><IconButton className='packing-aux' size='small' onClick={()=> {/* future remove single */}}><DeleteOutlineIcon fontSize='small' /></IconButton></Tooltip>
                <IconButton className='packing-aux' size='small' onClick={()=> dispatch(updateQuantity({ categoryId: active.id, itemId:item.id, delta:-1 }))} sx={{ width:30, height:30 }}>-</IconButton>
                <Chip size='small' label={item.qty+'x'} sx={{ borderRadius:2, fontWeight:500 }} />
                <IconButton className='packing-aux' size='small' onClick={()=> dispatch(updateQuantity({ categoryId: active.id, itemId:item.id, delta:1 }))} sx={{ width:28, height:28 }}>+</IconButton>
              </Box>
            </Box>
          ))}
        </Box>
        <Box component='form' onSubmit={(e)=> { e.preventDefault(); handleAddItem(); }} sx={{ position:'relative' }}>
          <TextField size='small' fullWidth placeholder='Add item..' value={newItem} onChange={e=> setNewItem(e.target.value)} InputProps={{ endAdornment:(
            <InputAdornment position='end'>
              <IconButton size='small' onClick={handleAddItem} disabled={!newItem.trim()}><AddIcon /></IconButton>
            </InputAdornment>
          ) }} />
        </Box>
        {/* Footer summary & delete removed per request */}
      </Box>
      {/* Add Category Dialog */}
      <Dialog open={addDialogOpen} onClose={()=> setAddDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Add category</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth size='small' placeholder='Search presets...' value={filterPreset} onChange={e=> setFilterPreset(e.target.value)} sx={{ mb:2 }} />
          <Box sx={{ display:'grid', gap:2, gridTemplateColumns:{ xs:'1fr', sm:'1fr 1fr', md:'1fr 1fr 1fr' } }}>
            {packingPresets.filter(p=> !filterPreset || p.name.toLowerCase().includes(filterPreset.toLowerCase())).map(p=> (
              <Card key={p.id} sx={{ p:1.5, display:'flex', flexDirection:'column', gap:.75 }}>
                <Typography variant='subtitle2' fontWeight={600}>{p.name}</Typography>
                <Typography variant='caption' color='text.secondary' noWrap>{p.items.slice(0,4).join(', ')}{p.items.length>4?'…':''}</Typography>
                <Button size='small' variant='outlined' sx={{ mt:.5, alignSelf:'flex-start' }} onClick={()=> selectPreset(p.id)}>Select</Button>
              </Card>
            ))}
          </Box>
          <Divider sx={{ my:2 }} />
          <Box sx={{ display:'flex', gap:1 }}>
            <TextField size='small' placeholder='Custom category name' value={customCategoryName} onChange={e=> setCustomCategoryName(e.target.value)} fullWidth />
            <Button variant='contained' size='small' disabled={!customCategoryName.trim()} onClick={createCustom}>Create</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setAddDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Category Dialog */}
      <Dialog open={editDialogOpen} onClose={()=> setEditDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Edit list</DialogTitle>
        <DialogContent dividers>
          <Typography variant='subtitle2' sx={{ mb:1 }}>{active?.name}</Typography>
          <Divider sx={{ my:2 }} />
          <Button color='error' variant='outlined' startIcon={<DeleteOutlineIcon />} onClick={()=> { if(active) { dispatch(removeCategory(active.id)); setEditDialogOpen(false); } }}>Delete list</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setEditDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={applyEdit}>Update list</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PackingPanel;
