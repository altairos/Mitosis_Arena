// Input Manager v5: High-Precision Direct Touch + Window Bounce Prevention

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false };

    // Active touch steering
    this.touchMove = {
      active: false,
      id: null,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    this.onSplitAction = null;
    this.onMergeAction = null;
    this.onPauseAction = null;

    this.init();
  }

  init() {
    // Keyboard
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space") { e.preventDefault(); if (this.onSplitAction) this.onSplitAction(); }
      if (e.code === "KeyE" || e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); if (this.onMergeAction) this.onMergeAction(); }
      if (e.code === "KeyP" || e.code === "Escape") { if (this.onPauseAction) this.onPauseAction(); }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    // Desktop Mouse
    window.addEventListener("mousemove", (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) { e.preventDefault(); if (this.onSplitAction) this.onSplitAction(); }
    });
    window.addEventListener("mouseup", (e) => { if (e.button === 0) this.mouse.down = false; });
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    this.setupTouch();
  }

  setupTouch() {
    const btnSplit = document.getElementById("btn-split");
    const btnMerge = document.getElementById("btn-merge");
    const pointerRing = document.getElementById("touch-pointer-ring");
    // Cheap state check instead of a DOM query per touch event
    const isModalOpen = () => window.game && window.game.state !== "PLAYING";

    // Left Touch Action Buttons (Split & Merge)
    if (btnSplit) {
      const handleSplit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onSplitAction) this.onSplitAction();
      };
      btnSplit.addEventListener("touchstart", handleSplit, { passive: false });
      btnSplit.addEventListener("click", handleSplit);
    }

    if (btnMerge) {
      const handleMerge = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onMergeAction) this.onMergeAction();
      };
      btnMerge.addEventListener("touchstart", handleMerge, { passive: false });
      btnMerge.addEventListener("click", handleMerge);
    }

    // Touch on Window: Prevent page drag & steer player smoothly
    window.addEventListener("touchstart", (e) => {
      // If modal is open, let user interact with modal natively
      if (isModalOpen()) {
        this.touchMove.active = false;
        if (pointerRing) pointerRing.style.display = "none";
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && (el.closest(".touch-btn") || el.closest(".icon-btn"))) continue;

        // Prevent window dragging / viewport scrolling
        e.preventDefault();

        this.touchMove.active = true;
        this.touchMove.id = t.identifier;
        this.touchMove.x = t.clientX;
        this.touchMove.y = t.clientY;

        if (pointerRing) {
          pointerRing.style.display = "block";
          pointerRing.style.left = t.clientX + "px";
          pointerRing.style.top = t.clientY + "px";
        }
        break;
      }
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      // If modal is open, allow native scroll
      if (isModalOpen()) return;

      if (!this.touchMove.active) return;

      // Prevent mobile browser window drag / pull-to-refresh
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touchMove.id) {
          this.touchMove.x = t.clientX;
          this.touchMove.y = t.clientY;
          if (pointerRing) {
            pointerRing.style.left = t.clientX + "px";
            pointerRing.style.top = t.clientY + "px";
          }
          break;
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touchMove.id) {
          this.touchMove.active = false;
          this.touchMove.id = null;
          if (pointerRing) pointerRing.style.display = "none";
          break;
        }
      }
    };

    window.addEventListener("touchend", endTouch, { passive: true });
    window.addEventListener("touchcancel", endTouch, { passive: true });
  }

  getMovementVector(playerScreenPos) {
    let vx = 0, vy = 0;

    // Keyboard (WASD)
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) vy -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) vy += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) vx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) vx += 1;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      return { x: vx / len, y: vy / len };
    }

    // Direct Touch Steering (Move toward finger position)
    if (this.touchMove.active && playerScreenPos) {
      const dx = this.touchMove.x - playerScreenPos.x;
      const dy = this.touchMove.y - playerScreenPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 8) {
        const factor = Math.min(1.0, (dist - 8) / 25);
        return {
          x: (dx / dist) * factor,
          y: (dy / dist) * factor
        };
      }
      return { x: 0, y: 0 };
    }

    // Desktop Mouse Drag
    if (this.mouse.down && playerScreenPos) {
      const dx = this.mouse.x - playerScreenPos.x;
      const dy = this.mouse.y - playerScreenPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 12) {
        const factor = Math.min(1.0, (dist - 12) / 45);
        return { x: (dx / dist) * factor, y: (dy / dist) * factor };
      }
    }

    return { x: 0, y: 0 };
  }
}

window.inputManager = new InputManager();
