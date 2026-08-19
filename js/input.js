// Input Management for Desktop (Keys/Mouse) & Mobile (Touch/Joystick)

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false, rightDown: false };
    this.worldMouse = { x: 0, y: 0 };
    this.isTouchDevice = false;
    
    // Joystick
    this.joystick = {
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
      vector: { x: 0, y: 0 } // Normalized [-1, 1]
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
      
      if (e.code === "Space") {
        e.preventDefault();
        if (this.onSplitAction) this.onSplitAction();
      }
      if (e.code === "KeyE" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault();
        if (this.onMergeAction) this.onMergeAction();
      }
      if (e.code === "KeyP" || e.code === "Escape") {
        if (this.onPauseAction) this.onPauseAction();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Mouse
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) {
        e.preventDefault();
        this.mouse.rightDown = true;
        if (this.onSplitAction) this.onSplitAction();
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Touch setup
    this.setupTouchControls();
  }

  setupTouchControls() {
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) {
      this.isTouchDevice = true;
      const mobileUI = document.getElementById("mobile-controls");
      if (mobileUI) mobileUI.style.display = "block";
    }

    const joystickZone = document.getElementById("joystick-zone");
    const joystickKnob = document.getElementById("joystick-knob");
    let touchId = null;

    if (joystickZone && joystickKnob) {
      const maxRadius = 45;

      const handleTouchStart = (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        this.joystick.originX = rect.left + rect.width / 2;
        this.joystick.originY = rect.top + rect.height / 2;
        this.joystick.active = true;
        updateKnob(touch.clientX, touch.clientY);
      };

      const handleTouchMove = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
          }
        }
      };

      const handleTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            touchId = null;
            this.joystick.active = false;
            this.joystick.vector = { x: 0, y: 0 };
            joystickKnob.style.transform = "translate(-50%, -50%)";
            break;
          }
        }
      };

      const updateKnob = (clientX, clientY) => {
        let dx = clientX - this.joystick.originX;
        let dy = clientY - this.joystick.originY;
        const dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.joystick.vector = {
          x: dist > 5 ? dx / maxRadius : 0,
          y: dist > 5 ? dy / maxRadius : 0
        };
      };

      joystickZone.addEventListener("touchstart", handleTouchStart, { passive: false });
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd, { passive: false });
      window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
    }

    // Touch Action Buttons
    const btnSplit = document.getElementById("btn-split");
    const btnMerge = document.getElementById("btn-merge");

    if (btnSplit) {
      btnSplit.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (this.onSplitAction) this.onSplitAction();
      }, { passive: false });
    }

    if (btnMerge) {
      btnMerge.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (this.onMergeAction) this.onMergeAction();
      }, { passive: false });
    }
  }

  getMovementVector() {
    let vx = 0;
    let vy = 0;

    // Keyboard WASD
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) vy -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) vy += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) vx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) vx += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      return { x: vx / len, y: vy / len };
    }

    // Joystick
    if (this.joystick.active && (this.joystick.vector.x !== 0 || this.joystick.vector.y !== 0)) {
      return this.joystick.vector;
    }

    return { x: 0, y: 0 };
  }
}

window.inputManager = new InputManager();
