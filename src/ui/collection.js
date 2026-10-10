// Collection progress per card type (owned vs. total), shown on the Shop and Deck pages.

import { BASIC_INGREDIENTS, PREMIUM_INGREDIENTS } from '../data/ingredients.js';
import { OBJECTS } from '../data/objects.js';

export const CARD_TYPES = [
  { key: 'basic', label: 'Basic', icon: '🧂', list: BASIC_INGREDIENTS },
  { key: 'premium', label: 'Premium', icon: '⭐', list: PREMIUM_INGREDIENTS },
  { key: 'objects', label: 'Objects', icon: '🧸', list: OBJECTS },
];

export function collectionCounts(state) {
  return CARD_TYPES.map((t) => ({ ...t, owned: t.list.filter((c) => state.deck[c.id] > 0).length, total: t.list.length }));
}

export function collectionBar(state) {
  return `<div class="collection-bar" aria-label="Cards collected">${collectionCounts(state).map((t) => `
    <div class="collection-tile type-${t.key} ${t.owned === t.total ? 'complete' : ''}" title="You own ${t.owned} of the ${t.total} ${t.label.toLowerCase()} cards">
      <span class="ct-label">${t.icon} ${t.label}</span>
      <span class="ct-count"><b>${t.owned}</b>/${t.total}${t.owned === t.total ? ' ✓' : ''}</span>
      <span class="ct-meter"><i style="width:${(t.owned / t.total) * 100}%"></i></span>
    </div>`).join('')}</div>`;
}
