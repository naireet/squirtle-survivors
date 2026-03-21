/**
 * External HTML joystick for mobile — sits below the Phaser canvas.
 * Exposes a shared vector that GameScene reads for movement input.
 */

const DEAD_ZONE = 8;
const MAX_DRAG = 42; // half the joystick base radius

/** Shared state — GameScene reads this */
export const externalJoystick = { x: 0, y: 0, active: false };

/** Initialize the external joystick (call once after DOM ready) */
export function initExternalJoystick() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const area = document.getElementById('joystick-area');
  if (!area) return;

  if (!isTouchDevice) {
    area.style.display = 'none';
    return;
  }

  area.style.display = 'block';

  const base = document.getElementById('joystick-base');
  const thumb = document.getElementById('joystick-thumb');
  if (!base || !thumb) return;

  const baseRect = () => base.getBoundingClientRect();
  let activeTouch = null;

  area.addEventListener('touchstart', (e) => {
    if (activeTouch !== null) return;
    const touch = e.changedTouches[0];
    activeTouch = touch.identifier;
    thumb.classList.add('active');
    externalJoystick.active = true;
    updateThumb(touch);
    e.preventDefault();
  }, { passive: false });

  area.addEventListener('touchmove', (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === activeTouch) {
        updateThumb(touch);
        e.preventDefault();
        break;
      }
    }
  }, { passive: false });

  const release = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === activeTouch) {
        activeTouch = null;
        externalJoystick.x = 0;
        externalJoystick.y = 0;
        externalJoystick.active = false;
        thumb.classList.remove('active');
        thumb.style.transform = 'translate(-50%, -50%)';
        break;
      }
    }
  };
  area.addEventListener('touchend', release);
  area.addEventListener('touchcancel', release);

  function updateThumb(touch) {
    const rect = baseRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > DEAD_ZONE) {
      const clamped = Math.min(dist, MAX_DRAG);
      const nx = dx / dist;
      const ny = dy / dist;
      externalJoystick.x = nx;
      externalJoystick.y = ny;

      const offsetX = nx * clamped;
      const offsetY = ny * clamped;
      thumb.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    } else {
      externalJoystick.x = 0;
      externalJoystick.y = 0;
      thumb.style.transform = 'translate(-50%, -50%)';
    }
  }
}
