import { createSlice, nanoid } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PackingItem {
  id: string;
  name: string;
  qty: number;
  checked: boolean;
}
export type PackingCategoryType = 'individual' | 'group';
export interface PackingCategory {
  id: string;
  name: string;
  type: PackingCategoryType;
  items: PackingItem[];
}
export interface PackingState {
  categories: PackingCategory[];
  activeCategoryId?: string;
}

export const packingPresets: { id: string; name: string; type: PackingCategoryType; items: string[] }[] = [
  { id: 'baby', name:'Baby', type:'group', items:['Diapers','Wipes','Baby Lotion','Baby Monitor','Bottle','Formula','Onesie','Baby Blanket'] },
  { id: 'beach', name:'Beach', type:'group', items:['Beach Towel','Swimwear','Sunscreen','Beach Bag','Flip Flops','Snorkel','Goggles','Beach Umbrella'] },
  { id: 'business', name:'Business', type:'individual', items:['Laptop','Charger','Notebook','Blazer','Dress Shirt','Formal Shoes','Presentation Remote','Business Cards'] },
  { id: 'carry-on', name:'Carry-on', type:'individual', items:['Passport','Boarding Pass','Headphones','Phone Charger','Mints','Snacks','Travel Pillow','Reading Material'] },
  { id: 'camping', name:'Camping', type:'group', items:['Tent','Sleeping Bag','Sleeping Pad','Camp Stove','Fuel','Headlamp','Lantern','Water Filter'] },
  { id: 'electronics', name:'Electronics', type:'group', items:['Phone','Tablet','Laptop','Chargers','Power Bank','Camera','SD Card','E-Reader'] },
  { id: 'food', name:'Food', type:'group', items:['Snacks','Water Bottle','Utensils','Cooler','Instant Meals'] },
  { id: 'hiking', name:'Hiking', type:'group', items:['Hiking Boots','Backpack','Trekking Poles','Trail Map','Water Reservoir','Trail Snacks','First Aid Kit'] },
  { id: 'make-up', name:'Make-up', type:'individual', items:['Foundation','Brush Set','Lipstick','Mascara','Makeup Remover','Compact Mirror'] },
  { id: 'music-festival', name:'Music Festival', type:'group', items:['Wristband','Portable Charger','Earplugs','Sunglasses','Reusable Bottle','Rain Poncho','Bandana'] },
  { id: 'gym', name:'Gym', type:'individual', items:['Gym Shoes','Shorts','Shirt','Towel','Water Bottle','Lock','Protein Bar'] },
  { id: 'fancy-dinner', name:'Fancy Dinner', type:'individual', items:['Dress / Suit','Dress Shoes','Accessories','Cologne / Perfume'] },
  { id: 'cycling', name:'Cycling', type:'group', items:['Helmet','Cycling Shoes','Repair Kit','Water Bottles','Jersey','Gloves'] },
  { id: 'kitesurfing', name:'Kitesurfing', type:'group', items:['Kite','Board','Harness','Pump','Wetsuit','Impact Vest'] },
  { id: 'motorcycling', name:'Motorcycling', type:'group', items:['Helmet','Jacket','Gloves','Boots','Tool Kit','Rain Gear'] }
];

const defaultCategories: PackingCategory[] = [
  { id: 'clothing', name: 'Clothing', type:'individual', items: [
    'Belt(s)','Boots','Bra(s)','Dress','Flip Flops','Hat','Heels','Hoodie','Jacket','Jeans','Pants','Sandals','Scarf','Shirt(s)','Shorts','Skirt','Sleepwear','Socks','Sunglasses','Sweater','Swimsuit','T-Shirt(s)','Underwear','Watch'
  ].map(n=> ({ id: nanoid(), name:n, qty:1, checked:false })) },
  { id: 'essentials', name: 'Essentials', type:'individual', items: [
    'Passport','ID / Driver License','Wallet','Credit Card','Cash','Tickets','Phone','Charger','Power Bank','Adapter','Medication','Insurance Docs','Itinerary Print','Emergency Contacts','Glasses / Contacts','Keys','Health Card','Local SIM','Guidebook','Pen'
  ].map(n=> ({ id: nanoid(), name:n, qty:1, checked:false })) },
  { id: 'toiletries', name: 'Toiletries', type:'individual', items: [
    'Toothbrush','Toothpaste','Floss','Deodorant','Razor','Shaving Cream','Brush / Comb','Shampoo','Conditioner','Body Wash','Face Wash','Moisturizer','Sunscreen','Lip Balm','Makeup','Makeup Remover','Perfume','Nail Clippers','First Aid Kit','Hand Sanitizer','Tissues','Wet Wipes','Feminine Products','Contacts Solution','Cotton Swabs','Tweezers'
  ].map(n=> ({ id: nanoid(), name:n, qty:1, checked:false })) }
];

const initialState: PackingState = {
  categories: defaultCategories,
  activeCategoryId: 'clothing'
};

interface TogglePayload { categoryId: string; itemId: string; }
interface AddItemPayload { categoryId: string; name: string; }
interface UpdateQtyPayload { categoryId: string; itemId: string; delta: number; }
interface AddCategoryPayload { name: string; }

const packingSlice = createSlice({
  name: 'packing',
  initialState,
  reducers: {
    setActiveCategory(state, action: PayloadAction<string>) { state.activeCategoryId = action.payload; },
    toggleItem(state, action: PayloadAction<TogglePayload>) {
      const cat = state.categories.find(c=> c.id===action.payload.categoryId);
      const item = cat?.items.find(i=> i.id===action.payload.itemId);
      if(item) item.checked = !item.checked;
    },
    addItem(state, action: PayloadAction<AddItemPayload>) {
      const cat = state.categories.find(c=> c.id===action.payload.categoryId);
      if(cat) cat.items.push({ id:nanoid(), name:action.payload.name, qty:1, checked:false });
    },
    updateQuantity(state, action: PayloadAction<UpdateQtyPayload>) {
      const cat = state.categories.find(c=> c.id===action.payload.categoryId);
      const item = cat?.items.find(i=> i.id===action.payload.itemId);
      if(item) { item.qty = Math.max(1, item.qty + action.payload.delta); }
    },
    addCategory(state, action: PayloadAction<AddCategoryPayload>) {
      const id = action.payload.name.toLowerCase().replace(/\s+/g,'-');
      state.categories.push({ id, name: action.payload.name, type:'individual', items: [] });
      state.activeCategoryId = id;
    },
    removeCategory(state, action: PayloadAction<string>) {
      const idx = state.categories.findIndex(c=> c.id===action.payload);
      if(idx>=0) {
        const removingActive = state.categories[idx].id === state.activeCategoryId;
        state.categories.splice(idx,1);
        if(removingActive) state.activeCategoryId = state.categories[0]?.id;
      }
    }
  }
});

export const { setActiveCategory, toggleItem, addItem, updateQuantity, addCategory, removeCategory } = packingSlice.actions;
export default packingSlice.reducer;
