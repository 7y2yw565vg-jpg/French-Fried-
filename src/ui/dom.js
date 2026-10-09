// Small DOM helpers shared by every screen.

import { cardArtSvg } from '../art/cards.js';
import { CARDS } from '../data/recipes.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, kind = 'info', ms = 2600) {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

let modalClose = null;
export function openModal(html, { cls = '', onClose, dismissable = true } = {}) {
  closeModal();
  const root = $('#modal');
  root.innerHTML = `<div class="modal-backdrop"></div><div class="modal ${cls}" role="dialog" aria-modal="true">${dismissable ? '<button class="modal-x" aria-label="Close">✕</button>' : ''}${html}</div>`;
  root.classList.add('open');
  modalClose = onClose || null;
  if (dismissable) {
    $('.modal-backdrop', root).onclick = closeModal;
    $('.modal-x', root).onclick = closeModal;
  }
  return $('.modal', root);
}

export function closeModal() {
  const root = $('#modal');
  if (!root || !root.classList.contains('open')) return;
  root.classList.remove('open');
  root.innerHTML = '';
  const cb = modalClose;
  modalClose = null;
  cb?.();
}

export const modalOpen = () => $('#modal')?.classList.contains('open');

export function tierLabel(card) {
  if (card.kind === 'object') return card.rarity;
  return card.tier;
}

/** Full-size playing card. */
export function cardHtml(id, { uid, cls = '', extra = '', tag = 'button', count } = {}) {
  const c = CARDS[id];
  const tierCls = c.kind === 'object' ? `tier-object rarity-${c.rarity}` : `tier-${c.tier}`;
  const attrs = uid != null ? `data-uid="${uid}"` : `data-id="${id}"`;
  return `<${tag} class="card ${tierCls} ${cls}" ${attrs} title="${esc(c.name)}">
    <span class="card-name">${esc(c.name)}</span>
    <span class="card-art">${cardArtSvg(c)}</span>
    <span class="card-foot">${tierLabel(c)}${count != null ? ` · x${count}` : ''}</span>
    ${extra}
  </${tag}>`;
}

/** Small icon chip of a card. */
export function chipHtml(id, { unknown = false } = {}) {
  if (unknown) return '<span class="chip unknown" title="Unknown ingredient">?</span>';
  const c = CARDS[id];
  return `<span class="chip ${c.kind === 'object' ? 'tier-object' : `tier-${c.tier}`}" title="${esc(c.name)}">${cardArtSvg(c)}</span>`;
}

export function packArtSvg(kind) {
  const premium = kind === 'premium';
  const c1 = premium ? '#2b2b3a' : '#e0342a';
  const c2 = premium ? '#f2c94c' : '#ffd93b';
  return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="foil-${kind}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${premium ? '#4a4a66' : '#ff6a4d'}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>
    <path d="M14 10 L22 4 L30 10 L38 4 L46 10 L54 4 L62 10 L70 4 L78 10 L86 4 L94 10 L102 4 L106 10 V150 L98 156 L90 150 L82 156 L74 150 L66 156 L58 150 L50 156 L42 150 L34 156 L26 150 L18 156 L14 150Z" fill="url(#foil-${kind})" stroke="#2b1d14" stroke-width="3" stroke-linejoin="round"/>
    <rect x="22" y="28" width="76" height="76" rx="10" fill="${c2}" stroke="#2b1d14" stroke-width="3"/>
    ${[34, 44, 54, 64, 74, 84].map((x, i) => `<rect x="${x - 4}" y="${40 + (i % 2) * 6}" width="9" height="${44 - (i % 2) * 6}" rx="2" fill="#f6c844" stroke="#2b1d14" stroke-width="2" transform="rotate(${(i - 2.5) * 6} ${x} 90)"/>`).join('')}
    <path d="M30 76 H90 L84 100 H36Z" fill="#e0342a" stroke="#2b1d14" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 76 L46 100 M54 76 L56 100 M66 76 L64 100 M78 76 L74 100" stroke="#fff" stroke-width="4"/>
    <text x="60" y="126" text-anchor="middle" font-family="Lilita One, Impact, sans-serif" font-size="17" fill="${premium ? '#f2c94c' : '#fff'}" stroke="#2b1d14" stroke-width="1">${premium ? 'PREMIUM' : 'BASIC'}</text>
    ${premium ? '<path d="M96 22 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3Z" fill="#fff6c8"/>' : ''}
  </svg>`;
}

export function countdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
