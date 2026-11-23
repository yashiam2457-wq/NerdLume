/**
 * NerdLume Interactive Background Animation Engine
 * Inspired by react-bits Squares & Spotlight components in NerdLume repository.
 * Features:
 * - Dynamic moving cybernetic grid
 * - Interactive mouse-hover square illumination with decay trail
 * - Cursor-following ambient radial spotlight glow
 * - Full performance optimization via requestAnimationFrame
 */
(function () {
  'use strict';

  var canvas = document.getElementById('bg-canvas');
  var spotlight = document.getElementById('bg-spotlight');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var width = 0;
  var height = 0;
  var animId = null;

  var squareSize = 48;
  var gridOffset = { x: 0, y: 0 };
  var speed = 0.28; // Elegant diagonal drift

  // Active glowing squares with fading trail: Map of key -> alpha
  var activeSquares = new Map();

  var mouse = { x: -1000, y: -1000, active: false };
  var targetMouse = { x: -1000, y: -1000 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  window.addEventListener('mousemove', function (e) {
    targetMouse.x = e.clientX;
    targetMouse.y = e.clientY;
    if (!mouse.active) {
      mouse.active = true;
      if (spotlight) spotlight.style.opacity = '1';
    }
  }, { passive: true });

  window.addEventListener('mouseleave', function () {
    mouse.active = false;
    if (spotlight) spotlight.style.opacity = '0';
  });

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Smooth mouse position lerping
    mouse.x += (targetMouse.x - mouse.x) * 0.22;
    mouse.y += (targetMouse.y - mouse.y) * 0.22;

    // Update cursor spotlight gradient
    if (spotlight && mouse.active) {
      spotlight.style.background = 'radial-gradient(650px circle at ' + mouse.x + 'px ' + mouse.y + 'px, rgba(34, 197, 94, 0.12), transparent 45%)';
    }

    if (!prefersReduced.matches) {
      gridOffset.x = (gridOffset.x + speed) % squareSize;
      gridOffset.y = (gridOffset.y + speed) % squareSize;
    }

    // Determine square hover on mouse interaction
    if (mouse.active) {
      var hCol = Math.floor((mouse.x + (gridOffset.x % squareSize)) / squareSize);
      var hRow = Math.floor((mouse.y + (gridOffset.y % squareSize)) / squareSize);
      var centerKey = hCol + ',' + hRow;
      activeSquares.set(centerKey, 1.0);

      // Light up immediate cross-neighbors for a radiant cyber bloom
      var neighbors = [
        (hCol + 1) + ',' + hRow,
        (hCol - 1) + ',' + hRow,
        hCol + ',' + (hRow + 1),
        hCol + ',' + (hRow - 1)
      ];
      for (var i = 0; i < neighbors.length; i++) {
        var nKey = neighbors[i];
        if (!activeSquares.has(nKey) || activeSquares.get(nKey) < 0.42) {
          activeSquares.set(nKey, 0.42);
        }
      }
    }

    // Draw grid and highlighted squares
    ctx.lineWidth = 1;
    var offsetX = gridOffset.x % squareSize;
    var offsetY = gridOffset.y % squareSize;

    for (var x = -squareSize; x < width + squareSize; x += squareSize) {
      for (var y = -squareSize; y < height + squareSize; y += squareSize) {
        var sqX = x - offsetX;
        var sqY = y - offsetY;
        var col = Math.floor((sqX + offsetX) / squareSize);
        var row = Math.floor((sqY + offsetY) / squareSize);
        var key = col + ',' + row;

        if (activeSquares.has(key)) {
          var alpha = activeSquares.get(key);
          ctx.fillStyle = 'rgba(34, 197, 94, ' + (alpha * 0.26) + ')';
          ctx.fillRect(sqX, sqY, squareSize, squareSize);
        }

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.055)';
        ctx.strokeRect(sqX, sqY, squareSize, squareSize);
      }
    }

    // Decay active squares smoothly
    var toDelete = [];
    activeSquares.forEach(function (alpha, key) {
      var nextAlpha = alpha - 0.022;
      if (nextAlpha <= 0) {
        toDelete.push(key);
      } else {
        activeSquares.set(key, nextAlpha);
      }
    });
    for (var d = 0; d < toDelete.length; d++) {
      activeSquares.delete(toDelete[d]);
    }

    // Radial vignette centered on viewport to preserve content readability
    var centerX = width / 2;
    var centerY = height / 2;
    var maxDim = Math.max(width, height);
    var vignette = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxDim * 0.75);
    vignette.addColorStop(0, 'rgba(7, 8, 13, 0)');
    vignette.addColorStop(0.55, 'rgba(7, 8, 13, 0.28)');
    vignette.addColorStop(1, 'rgba(7, 8, 13, 0.88)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    animId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animId) cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(draw);
    }
  });

  animId = requestAnimationFrame(draw);
})();
