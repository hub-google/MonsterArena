// Preserve the stored quantity type; consumers choose whether to coerce it.
export function getItemQuantity(inventory,itemId){
  const item = inventory.find(i => i.item_id === itemId);
  return item ? item.quantity : 0;
}
