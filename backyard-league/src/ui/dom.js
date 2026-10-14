// Tiny DOM helpers + modal/toast system.
import { sfx } from './audio.js';

export const $ = (sel) => document.querySelector(sel);

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function btn(label, onClick, cls = '', attrs = {}) {
  return h('button', { class: `btn ${cls}`, onclick: (e) => { sfx('click'); onClick && onClick(e); }, ...attrs }, label);
}

export function toast(text, kind = '') {
  const el = h('div', { class: `toast ${kind}` }, text);
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200 + Math.min(4000, text.length * 25));
}

const modalStack = [];

/**
 * Show a modal. buttons: [{label, cls, onClick, keep}] - a button closes the modal unless keep.
 * Returns { close, el, body }.
 */
export function modal({ title, body, buttons = [{ label: 'OK' }], wide = false, onClose = null, dismissable = true }) {
  const root = $('#modal');
  const bodyEl = h('div', { class: 'body' });
  if (body instanceof Node) bodyEl.appendChild(body); else if (body) bodyEl.textContent = body;
  const card = h('div', { class: `card modal-card ${wide ? 'wide' : ''}` }, title ? h('h2', {}, title) : null, bodyEl);
  const row = h('div', { class: 'btn-row' });
  const handle = { el: card, body: bodyEl, close: null };
  for (const b of buttons) {
    row.appendChild(btn(b.label, () => { if (!b.keep) handle.close(); b.onClick && b.onClick(); }, b.cls || '', b.disabled ? { disabled: true } : {}));
  }
  if (buttons.length) card.appendChild(row);
  const bg = h('div', { class: 'screen-bg', onclick: () => { if (dismissable) handle.close(); } });
  const wrap = h('div', {}, bg, card);
  handle.close = () => {
    wrap.remove();
    const i = modalStack.indexOf(handle);
    if (i >= 0) modalStack.splice(i, 1);
    if (!modalStack.length) root.classList.remove('show');
    onClose && onClose();
  };
  handle.dismissable = dismissable;
  root.appendChild(wrap);
  root.classList.add('show');
  modalStack.push(handle);
  return handle;
}

/** Close every open modal (used by tests and when quitting). */
export function closeAllModals() {
  while (modalStack.length) modalStack[modalStack.length - 1].close();
}

export function modalOpen() {
  return modalStack.length > 0;
}

export function closeTopModal() {
  const top = modalStack[modalStack.length - 1];
  if (top && top.dismissable) { top.close(); return true; }
  return false;
}

export function ask(title, text, options) {
  return new Promise((resolve) => {
    modal({ title, body: text, dismissable: false, buttons: options.map((o) => ({ label: o.label, cls: o.cls, onClick: () => resolve(o.value) })) });
  });
}

export function money(n) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export function gradeChip(label, value) {
  if (label === '?' || value == null) return h('span', { class: 'grade unknown' }, '?');
  const i = ['A++', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F+', 'F', 'F-', 'F--'].indexOf(label.split('/')[0]);
  const hue = Math.round(130 - (Math.max(0, i) / 16) * 130);
  return h('span', { class: 'grade', style: { background: `hsl(${hue} 65% 42%)` } }, label);
}
