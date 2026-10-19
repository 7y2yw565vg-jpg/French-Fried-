// A tiny DOM toolkit: build elements once, then refresh their text and state from "live" bindings.

type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; onClick?: (e: MouseEvent) => void };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'onClick') el.addEventListener('click', v as EventListener);
      else if (k === 'onInput') el.addEventListener('input', v as (e: Event) => void);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Bindings re-evaluated every frame. Rebuilding a panel clears its bindings. */
export class Live {
  private fns: (() => void)[] = [];

  text<T extends HTMLElement>(el: T, fn: () => string): T {
    let last = '';
    this.fns.push(() => {
      const v = fn();
      if (v !== last) el.textContent = last = v;
    });
    return el;
  }

  html<T extends HTMLElement>(el: T, fn: () => string): T {
    let last = '';
    this.fns.push(() => {
      const v = fn();
      if (v !== last) el.innerHTML = last = v;
    });
    return el;
  }

  disabled<T extends HTMLButtonElement | HTMLInputElement>(el: T, fn: () => boolean): T {
    this.fns.push(() => {
      const v = fn();
      if (el.disabled !== v) el.disabled = v;
    });
    return el;
  }

  cls<T extends HTMLElement>(el: T, name: string, fn: () => boolean): T {
    this.fns.push(() => el.classList.toggle(name, fn()));
    return el;
  }

  width<T extends HTMLElement>(el: T, fn: () => number): T {
    let last = -1;
    this.fns.push(() => {
      const v = Math.round(Math.max(0, Math.min(1, fn())) * 1000) / 10;
      if (v !== last) el.style.width = `${(last = v)}%`;
    });
    return el;
  }

  run(): void {
    for (const f of this.fns) f();
  }

  clear(): void {
    this.fns = [];
  }
}

export function bar(live: Live, fn: () => number, cls = ''): HTMLElement {
  const fill = h('div', { class: 'bar-fill' });
  live.width(fill, fn);
  return h('div', { class: `bar ${cls}` }, fill);
}

export function button(label: string | Node, onClick: () => void, cls = ''): HTMLButtonElement {
  return h('button', { class: `btn ${cls}`, onClick: (e: MouseEvent) => (e.stopPropagation(), onClick()) }, label);
}
