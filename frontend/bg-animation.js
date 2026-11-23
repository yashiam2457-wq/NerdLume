/**
 * NerdLume — Interactive High-Velocity Cybernetic Background Engine
 * Synthesizes Squares, Magnetic Particles, and Responsive Spotlight mechanics
 * Built for ultra-fast, zero-lag mouse tracking and 60fps/120fps hardware acceleration.
 */

(function () {
  'use strict';

  function initBackground() {
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'bg-canvas';
      canvas.className = 'bg-canvas';
      document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // High-speed mouse coordinate tracking
    const mouse = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.35,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.35,
      speed: 0,
      isHovered: true,
      lastX: window.innerWidth * 0.5,
      lastY: window.innerHeight * 0.35,
    };

    // Configuration inspired by Squares & Particles components
    const config = {
      squareSize: 48,
      gridSpeedX: 0.25,
      gridSpeedY: 0.15,
      hoverRadius: 220,
      particleCount: 45,
      lineConnectionDist: 90,
      spotlightRadius: 380,
    };

    let gridOffsetX = 0;
    let gridOffsetY = 0;
    let animId = null;
    let isVisible = true;

    // Resize canvas to full viewport with DPR scaling
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    }

    // Particle pool with magnetic vector mechanics
    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = initial ? Math.random() * width : (Math.random() < 0.5 ? -10 : width + 10);
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.baseSize = Math.random() * 1.8 + 0.8;
        this.size = this.baseSize;
        this.alpha = Math.random() * 0.45 + 0.2;
        this.color = Math.random() > 0.4 ? 'rgba(34, 197, 94,' : (Math.random() > 0.5 ? 'rgba(16, 185, 129,' : 'rgba(56, 189, 248,');
        this.magnetism = Math.random() * 2 + 1;
      }

      update() {
        // Natural drift
        this.x += this.vx;
        this.y += this.vy;

        // Fast magnetic reaction to cursor movement
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 180 && dist > 1) {
          const force = (1 - dist / 180) * 0.8 * this.magnetism;
          // Fluid swift acceleration toward & swirling cursor
          this.x += (dx / dist) * force * 2.2;
          this.y += (dy / dist) * force * 2.2;
          this.size = this.baseSize * 1.5;
        } else {
          this.size += (this.baseSize - this.size) * 0.1;
        }

        // Screen wrap
        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `${this.color}${this.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(34, 197, 94, 0.4)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(new Particle());
    }

    // High velocity pointer tracking: zero lag event
    window.addEventListener('pointermove', function (e) {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovered = true;

      // Calculate instantaneous movement speed
      const distTraveled = Math.hypot(e.clientX - mouse.lastX, e.clientY - mouse.lastY);
      mouse.speed = Math.min(distTraveled, 35);
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      mouse.isHovered = false;
    });

    window.addEventListener('resize', resize);

    // Fast animation render loop
    function render() {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Fast responsive coordinate interpolation (lerp factor 0.4 for instantaneous responsiveness)
      mouse.x += (mouse.targetX - mouse.x) * 0.4;
      mouse.y += (mouse.targetY - mouse.y) * 0.4;

      // Update grid offsets for subtle ambient motion
      gridOffsetX = (gridOffsetX + config.gridSpeedX) % config.squareSize;
      gridOffsetY = (gridOffsetY + config.gridSpeedY) % config.squareSize;

      // 1. Draw Interactive Radial Spotlight (Spotlight Component)
      if (mouse.isHovered) {
        const spotRadius = config.spotlightRadius + mouse.speed * 2.5;
        const radGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          spotRadius
        );
        radGrad.addColorStop(0, 'rgba(34, 197, 94, 0.16)');
        radGrad.addColorStop(0.3, 'rgba(16, 185, 129, 0.09)');
        radGrad.addColorStop(0.65, 'rgba(6, 95, 70, 0.03)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Draw Interactive Cybernetic Grid ("Squares" logic)
      const startX = -config.squareSize + gridOffsetX;
      const startY = -config.squareSize + gridOffsetY;
      const hoverRadSq = config.hoverRadius * config.hoverRadius;

      ctx.lineWidth = 1;

      for (let x = startX; x < width + config.squareSize; x += config.squareSize) {
        for (let y = startY; y < height + config.squareSize; y += config.squareSize) {
          const centerX = x + config.squareSize * 0.5;
          const centerY = y + config.squareSize * 0.5;

          const dx = centerX - mouse.x;
          const dy = centerY - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (mouse.isHovered && distSq < hoverRadSq) {
            // Rapid reactive illumination of hovered grid squares
            const factor = 1 - Math.sqrt(distSq) / config.hoverRadius;
            ctx.fillStyle = `rgba(34, 197, 94, ${factor * 0.22})`;
            ctx.fillRect(x, y, config.squareSize, config.squareSize);

            ctx.strokeStyle = `rgba(74, 222, 128, ${0.12 + factor * 0.35})`;
          } else {
            // Subtle baseline cybernetic grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.024)';
          }

          ctx.strokeRect(x, y, config.squareSize, config.squareSize);
        }
      }

      // 3. Draw Laser Constellation Connections between nearby particles
      ctx.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < config.lineConnectionDist) {
            const alpha = (1 - dist / config.lineConnectionDist) * 0.18;
            ctx.strokeStyle = `rgba(34, 197, 94, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // 4. Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }

      // 5. Ambient Viewport Edge Vignette (keeps contrast centered & edges clean)
      const maxDim = Math.max(width, height);
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        maxDim * 0.25,
        width * 0.5,
        height * 0.45,
        maxDim * 0.8
      );
      vignette.addColorStop(0, 'rgba(7, 8, 13, 0)');
      vignette.addColorStop(0.65, 'rgba(7, 8, 13, 0.4)');
      vignette.addColorStop(1, 'rgba(7, 8, 13, 0.88)');

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    }

    // Track tab visibility to save power/CPU
    document.addEventListener('visibilitychange', function () {
      isVisible = !document.hidden;
    });

    // Wire Card Spotlight Highlight (SpotlightCard pattern)
    // Synchronizes localized card border illumination with cursor movement
    function setupCardSpotlights() {
      const cards = document.querySelectorAll('.card, .mode-card, .output-card, .auth-card');
      cards.forEach(card => {
        card.addEventListener('pointermove', function (e) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--card-mouse-x', `${x}px`);
          card.style.setProperty('--card-mouse-y', `${y}px`);
        }, { passive: true });
      });
    }

    resize();
    render();
    setupCardSpotlights();

    // Re-bind spotlights if dynamic DOM elements change
    const observer = new MutationObserver(setupCardSpotlights);
    const mainContainer = document.querySelector('main') || document.body;
    observer.observe(mainContainer, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackground);
  } else {
    initBackground();
  }
})();
