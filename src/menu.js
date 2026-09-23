// Static menu. Prices are integer sen.
export const MENU = Object.freeze([
  { id: 'roti-canai', name: 'Roti Canai', price: 150, category: 'food', description: 'With dhal and fish curry' },
  { id: 'roti-telur', name: 'Roti Telur', price: 250, category: 'food', description: 'Egg folded in, crisp edges' },
  { id: 'nasi-lemak', name: 'Nasi Lemak', price: 450, category: 'food', description: 'Sambal, egg, ikan bilis, kacang' },
  { id: 'mee-goreng-mamak', name: 'Mee Goreng Mamak', price: 700, category: 'food', description: 'Wok-fried yellow noodles' },
  { id: 'teh-tarik', name: 'Teh Tarik', price: 250, category: 'drink', description: 'Hot, frothy, sweet' },
  { id: 'milo-ais', name: 'Milo Ais', price: 350, category: 'drink', description: 'Iced, extra Milo on top' },
].map((item) => Object.freeze(item)));

export function findMenuItem(id) {
  return MENU.find((item) => item.id === id);
}
