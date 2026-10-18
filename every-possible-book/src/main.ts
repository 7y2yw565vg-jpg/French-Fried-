// Boot: fonts, the save, the stage, the interface, then the register.
import { Game } from './game';
import { Scene } from './render/scene';
import { UI } from './ui/ui';
import { openIntro } from './ui/modals';
import { loadSettings } from './ui/settings';
import { audio } from './audio/audio';

declare const __DEV__: boolean;

async function loadFonts(): Promise<void> {
  const faces = ['20px "EB Garamond"', 'italic 20px "EB Garamond"', '500 20px "EB Garamond"', '14px "IBM Plex Mono"', '20px "Noto Sans Runic"', '20px "Noto Sans Glagolitic"'];
  try {
    await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f, f.includes('Runic') ? 'ᚠᚢᚦ' : f.includes('Glagolitic') ? 'ⰀⰁⰂ' : 'abc'))), new Promise((r) => setTimeout(r, 3000))]);
  } catch {
    /* fall back to system serif */
  }
}

async function boot(): Promise<void> {
  loadSettings();
  await loadFonts();
  const game = new Game();
  await game.load();
  const hadSave = !game.isNew;
  const scene = new Scene(game);
  const ui = new UI(game, scene, document.getElementById('ui')!);
  await scene.init(document.getElementById('stage')!, {
    onRead: () => game.read(),
    onDoor: () => ui.doorClicked(),
    onLucid: () => ui.openLucid(),
    onWindow: () => ui.windowClicked(),
  });
  scene.library.onStamp = () => audio.clatter(Math.log10(1 + game.stats.printRate));
  scene.stacks.onStep = (q, r) => game.step(q, r);
  ui.build();
  game.paused = true;
  openIntro(game, hadSave, () => {
    game.paused = false;
    ui.layout();
  });
  const save = () => game.save();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('beforeunload', save);
  // Audio can only start after a gesture; any click will do.
  window.addEventListener('pointerdown', () => audio.start(), { once: true });
  if (__DEV__) (window as unknown as { game: Game }).game = game;
  (window as unknown as { __epb: { game: Game; scene: Scene; ui: UI } }).__epb = { game, scene, ui };
}

void boot();
