export const departments = [
  { id: 'vehicles', name: 'Vehicles', tagline: 'Find your next ride.', subs: [{id:'cars',name:'Complete vehicles'}] },
  { id: 'rims', name: 'Rims', tagline: 'Make the finishing touch your own.', subs: [{id:'rims',name:'Rims'}] },
  { id: 'clothing', name: 'Clothing', tagline: 'Wear your own world.', subs: [{id:'jacket',name:'Jackets'},{id:'topwear',name:'Tops'},{id:'bottomwear',name:'Bottoms'},{id:'footwear',name:'Shoes'},{id:'suit',name:'Suits'},{id:'hats',name:'Hats'},{id:'helmets',name:'Helmets'},{id:'eyewear',name:'Glasses'},{id:'mask',name:'Masks'},{id:'jewelry',name:'Headphones'},{id:'extra',name:'Accessories'}] },
  { id: 'furniture', name: 'Furniture', tagline: 'Make room for you.', subs: [{id:'seating',name:'Seating'},{id:'tables-desks',name:'Tables & desks'},{id:'storage',name:'Storage'},{id:'decor',name:'Home objects'},{id:'rugs',name:'Rugs & mats'}] },
  { id: 'statues', name: 'Statues', tagline: 'Objects with presence.', subs: [{id:'sculptures',name:'Sculptures'},{id:'busts',name:'Busts & figures'},{id:'guild-objects',name:'Guild objects'}] },
  { id: 'totems', name: 'Totems', tagline: 'A story to carry.', subs: [{id:'totems',name:'Frank Wilder totems'}] },
] as const;
