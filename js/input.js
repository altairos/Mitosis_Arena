// Input Manager v3: Direct Canvas Touch + Desktop KB/Mouse

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false };

    // Direct touch steering state
    this.touchMove = {
      active: false,
      id: null,
      x: 0,
      y: 0
    };

    this.onSplitAction = null;
    this.onMergeAction = null;
    this.onPauseAction = null;

    this._splitBtnIds = new Set();
    this._mergeBtnIds = new Set();

    this.init();
  }

  init() {
    // ===== KEYBOARD =====
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space") { e.preventDefault(); if (this.onSplitAction) this.onSplitAction(); }
      if (e.code === "KeyE" || e.code === "ShiftLeft" || e.code === "ShiftRight") { e.preventDefault(); if (this.onMergeAction) this.onMergeAction(); }
      if (e.code === "KeyP" || e.code === "Escape") { if (this.onPauseAction) this.onPauseAction(); }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    // ===== DESKTOP MOUSE =====
    window.addEventListener("mousemove", (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) { e.preventDefault(); if (this.onSplitAction) this.onSplitAction(); }
    });
    window.addEventListener("mouseup", (e) => { if (e.button === 0) this.mouse.down = false; });
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // ===== TOUCH: Split & Merge buttons (Left Hand) =====
    const btnSplit = document.getElementById("btn-split");
    const btnMerge = document.getElementById("btn-merge");

    if (btnSplit) {
      const handleSplit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (let t of e.changedTouches) this._splitBtnIds.add(t.identifier);
        if (this.onSplitAction) this.onSplitAction();
      };
      btnSplit.addEventListener("touchstart", handleSplit, { passive: false });
      btnSplit.addEventListener("click", handleSplit);
      btnSplit.addEventListener("touchend", (e) => {
        for (let t of e.changedTouches) this._splitBtnIds.delete(t.identifier);
      }, { passive: true });
    }

    if (btnMerge) {
      const handleMerge = (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (let t of e.changedTouches) this._mergeBtnIds.add(t.identifier);
        if (this.onMergeAction) this.onMergeAction();
      };
      btnMerge.addEventListener("touchstart", handleMerge, { passive: false });
      btnMerge.addEventListener("click", handleMerge);
      btnMerge.addEventListener("touchend", (e) => {
        for (let t of e.changedTouches) this._mergeBtnIds.delete(t.identifier);
      }, { passive: true });
    }

    // ===== TOUCH: Direct screen steering on CANVAS =====
    const canvas = document.getElementById("gameCanvas");
    const pointerRing = document.getElementById("touch-pointer-ring");

    if (canvas) {
      canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (this._splitBtnIds.has(t.identifier) || this._mergeBtnIds.has(t.identifier)) continue;
          if (!this.touchMove.active) {
            this.touchMove.active = true;
            this.touchMove.id = t.identifier;
            this.touchMove.x = t.clientX;
            this.touchMove.y = t.clientY;
            if (pointerRing) {
              pointerRing.style.display = "block";
              pointerRing.style.left = t.clientX + "px";
              pointerRing.style.top = t.clientY + "px";
            }
          }
        }
      }, { passive: false });

      canvas.addEventListener("touchmove", (e) => {
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

      const endSteer = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchMove.id) {
            this.touchMove.active = false;
            this.touchMove.id = null;
            if (pointerRing) pointerRing.style.display = "none";
          }
        }
      };
      canvas.addEventListener("touchend", endSteer, { passive: true });
      canvas.addEventListener("touchcancel", endSteer, { passive: true });
    }
  }

  getMovementVector(playerScreenPos) {
    let vx = 0, vy = 0;

    // Keyboard
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) vy -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) vy += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) vx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) vx += 1;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      return { x: vx / len, y: vy / len };
    }

    // Touch steering: move toward finger touch position
    if (this.touchMove.active && playerScreenPos) {
      const dx = this.touchMove.x - playerScreenPos.x;
      const dy = this.touchMove.y - playerScreenPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 15) {
        const factor = Math.min(1.0, (dist - 15) / 55);
        return { x: (dx / dist) * factor, y: (dy / dist) * factor };
      }
      return { x: 0, y: 0 };
    }

    return { x: 0, y: 0 };
  }
}

window.inputManager = new InputManager();
