let field;
let canvasContainer;

const BLOCK_SIZE = 4;

let SKY_HEIGHT;
let GROUND_HEIGHT;
let DIRT_HEIGHT;
let WATER_HEIGHT;
let CANVAS_HEIGHT;

let dirtPebbles = [];
let bottomWave = [];

// Graphics buffers
let skyGraphics;
let grassGraphics;
let treeGraphics;
let dirtGraphics;

//------------------------------------------------------------
// SETUP
//------------------------------------------------------------
function setup() {
  pixelDensity(1);
  canvasContainer = $("#canvas-container");

  computeHeights();

  const canvas = createCanvas(windowWidth, CANVAS_HEIGHT);
  canvas.parent("canvas-container");

  // Debounced resize
  $(window).on("resize", debounce(() => {
    computeHeights();
    resizeCanvas(windowWidth, CANVAS_HEIGHT);
    rebuildStaticLayers();
    redraw(); // reflect new buffers immediately
  }, 150));

  strokeWeight(3);
  noFill();

  generatePebbles();
  rebuildStaticLayers();

  field = new Field();

  // Draw only when needed (scroll/occasional breeze)
  noLoop();
  window.addEventListener("scroll", () => redraw(), { passive: true });
}

//------------------------------------------------------------
// HEIGHT HELPERS
//------------------------------------------------------------
function computeHeights() {
  SKY_HEIGHT    = windowHeight * 1.0;
  GROUND_HEIGHT = windowHeight * 0.1;
  DIRT_HEIGHT   = windowHeight * 5.0;
  WATER_HEIGHT  = windowHeight * 1.0;

  CANVAS_HEIGHT = SKY_HEIGHT + GROUND_HEIGHT + DIRT_HEIGHT + WATER_HEIGHT;
}

//------------------------------------------------------------
// STATIC LAYER BUILDER
//------------------------------------------------------------
function rebuildStaticLayers() {
  // SKY
  skyGraphics = createGraphics(windowWidth, SKY_HEIGHT);
  drawPixelSky(skyGraphics);
  drawPixelStars(skyGraphics);
  drawPixelClouds(skyGraphics);

  // GRASS
  grassGraphics = createGraphics(windowWidth, GROUND_HEIGHT);
  drawPixelGrass(grassGraphics);

  // TREES (uses bottomWave computed in drawPixelGrass)
  treeGraphics = createGraphics(windowWidth, GROUND_HEIGHT);
  //drawTreesInto(treeGraphics);

  // DIRT
  dirtGraphics = createGraphics(windowWidth, DIRT_HEIGHT * 1.5);
  drawPixelDirtInto(dirtGraphics);
}

//------------------------------------------------------------
// DRAW
//------------------------------------------------------------
let lastGrassUpdate = 0;
function draw() {
  clear();
  noSmooth();

  // Align canvas with page using translation
  translate(0, -window.scrollY);

  // Gentle breeze: rebuild grass occasionally
  if (frameCount - lastGrassUpdate > 1800) { // ~30s @60fps
    drawPixelGrass(grassGraphics);
    drawTreesInto(treeGraphics); // trees sit on grass edge -> rebuild to match
    lastGrassUpdate = frameCount;
  }

  image(skyGraphics, 0, 0);
  image(grassGraphics, 0, SKY_HEIGHT);
  image(treeGraphics, 0, SKY_HEIGHT);
  image(dirtGraphics, 0, SKY_HEIGHT + GROUND_HEIGHT);
}

//---------------------------------------------------------------------------
// DRAW HELPERS
//---------------------------------------------------------------------------

//------------------------------------------------------------
// SKY
//------------------------------------------------------------
function drawPixelSky(pg) {
  const bands = [
    color(50, 49, 109),
    color(64, 65, 132),
    color(82, 86, 157),
    color(100, 108, 180),
    color(112, 122, 194),
  ];

  const WAVE_AMPLITUDE = 75;
  const OVERLAP_PADDING = WAVE_AMPLITUDE;
  const totalHeight = floor(SKY_HEIGHT / BLOCK_SIZE) * BLOCK_SIZE;
  const gradientStartY = floor((SKY_HEIGHT * 0.5) / BLOCK_SIZE) * BLOCK_SIZE;
  const waveRegionHeight = floor((totalHeight * 0.5) / BLOCK_SIZE) * BLOCK_SIZE;

  pg.noStroke();
  pg.fill(bands[0]);
  for (let y = 0; y < SKY_HEIGHT; y += BLOCK_SIZE) {
    for (let x = 0; x < pg.width; x += BLOCK_SIZE) {
      pg.rect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    }
  }

  const waveBands = bands.slice(1);
  const weights = [4, 3, 2, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const bandHeights = weights.map(w =>
    floor(((w / totalWeight * waveRegionHeight) + OVERLAP_PADDING) / BLOCK_SIZE) * BLOCK_SIZE
  );

  for (let x = 0; x < pg.width; x += BLOCK_SIZE) {
    let yCursor = gradientStartY;
    for (let i = 0; i < waveBands.length; i++) {
      const bandColor = waveBands[i];
      const bandHeight = bandHeights[i];
      const waveSteps = floor(noise((x + i * 1000) * 0.01) * (WAVE_AMPLITUDE / BLOCK_SIZE));
      const yWave = waveSteps * BLOCK_SIZE;
      const bandTop = yCursor + yWave;
      const bandBottom = bandTop + bandHeight;

      pg.fill(bandColor);
      for (let y = bandTop; y < bandBottom; y += BLOCK_SIZE) {
        if (y < 0 || y >= SKY_HEIGHT) continue;
        pg.rect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      }
      yCursor += bandHeights[i] - OVERLAP_PADDING;
    }
  }
}

//------------------------------------------------------------
// STARS
//------------------------------------------------------------
function drawPixelStars(pg) {
  const STAR_HEIGHT = floor(SKY_HEIGHT * 0.6);
  const STAR_DENSITY = 0.00011;
  const starCount = floor(pg.width * STAR_HEIGHT * STAR_DENSITY);
  const usedCells = new Set();

  for (let i = 0; i < starCount; i++) {
    let x = floor(random(pg.width / BLOCK_SIZE)) * BLOCK_SIZE;
    let y = floor(random(STAR_HEIGHT / BLOCK_SIZE)) * BLOCK_SIZE;
    let type = random();

    if (type < 0.7) {
      if (!occupies(x, y, 0, usedCells)) {
        drawStarDot(pg, x, y);
        markOccupied(x, y, 0, usedCells);
      }
    } else if (type < 0.85) {
      if (!occupies(x, y, 1, usedCells)) {
        drawCrossStar(pg, x, y);
        markOccupied(x, y, 1, usedCells);
      }
    } else if (type < 0.97) {
      if (!occupies(x, y, 2, usedCells)) {
        drawDiamondStar(pg, x, y);
        markOccupied(x, y, 2, usedCells);
      }
    }
  }
}

function drawStarDot(pg, x, y) {
  pg.noStroke();
  pg.fill(220);
  pg.rect(x, y, BLOCK_SIZE, BLOCK_SIZE);
}

function drawCrossStar(pg, x, y) {
  const crossPixels = [
    { dx: 0, dy: 0, color: "#e5f0ff" },
    { dx: -1, dy: 0, color: "#9baee2" },
    { dx: 0, dy: -1, color: "#9cb2e6" },
    { dx: 1, dy: 0, color: "#9dabe0" },
    { dx: 0, dy: 1, color: "#9ca7d7" }
  ];
  for (const p of crossPixels) {
    const px = x + p.dx * BLOCK_SIZE;
    const py = y + p.dy * BLOCK_SIZE;
    pg.fill(p.color);
    pg.noStroke();
    pg.rect(px, py, BLOCK_SIZE, BLOCK_SIZE);
  }
}

function drawDiamondStar(pg, x, y) {
  const diamondPixels = [
    { dx: 0, dy: 0, color: "#e4ecf2" },
    { dx: -1, dy: 0, color: "#98b7ef" },
    { dx: -2, dy: 0, color: "#697abb" },
    { dx: -1, dy: -1, color: "#6f83c3" },
    { dx: -1, dy: 1, color: "#7480bf" },
    { dx: 0, dy: -1, color: "#9db5ee" },
    { dx: 0, dy: -2, color: "#7384c7" },
    { dx: 1, dy: 0, color: "#9db0e9" },
    { dx: 2, dy: 0, color: "#7484c6" },
    { dx: 1, dy: -1, color: "#798ecb" },
    { dx: 1, dy: 1, color: "#6c7cbd" },
    { dx: 0, dy: 1, color: "#97b4e6" },
    { dx: 0, dy: 2, color: "#7981bb" }
  ];
  for (const p of diamondPixels) {
    const px = x + p.dx * BLOCK_SIZE;
    const py = y + p.dy * BLOCK_SIZE;
    pg.fill(p.color);
    pg.noStroke();
    pg.rect(px, py, BLOCK_SIZE, BLOCK_SIZE);
  }
}

function occupies(x, y, size, set) {
  for (let dx = -size * BLOCK_SIZE; dx <= size * BLOCK_SIZE; dx += BLOCK_SIZE) {
    for (let dy = -size * BLOCK_SIZE; dy <= size * BLOCK_SIZE; dy += BLOCK_SIZE) {
      if (set.has(`${x + dx},${y + dy}`)) return true;
    }
  }
  return false;
}

function markOccupied(x, y, size, set) {
  for (let dx = -size * BLOCK_SIZE; dx <= size * BLOCK_SIZE; dx += BLOCK_SIZE) {
    for (let dy = -size * BLOCK_SIZE; dy <= size * BLOCK_SIZE; dy += BLOCK_SIZE) {
      set.add(`${x + dx},${y + dy}`);
    }
  }
}

//------------------------------------------------------------
// CLOUDS
//------------------------------------------------------------
function drawPixelClouds(pg) {
  const CLOUD_COLOR = color(64, 65, 132);
  const MAX_CLOUDS = 8;
  const cloudMinSize = 15;
  const cloudMaxSize = 30;
  const skyTop = SKY_HEIGHT * 0.20;
  const skyBottom = SKY_HEIGHT * 0.5;

  for (let i = 0; i < MAX_CLOUDS; i++) {
    const baseX = floor(random(pg.width / BLOCK_SIZE)) * BLOCK_SIZE;
    const baseY = floor(random(skyTop, skyBottom) / BLOCK_SIZE) * BLOCK_SIZE;
    const cloudWidth = floor(random(cloudMinSize, cloudMaxSize));
    const cloudHeight = floor(random(6, 12));
    const taperVariance = random(0.4, 1.0);
    const randomOffset = random(1000);

    for (let y = 0; y < cloudHeight; y++) {
      const noiseFactor = noise(randomOffset, y * 0.3);
      const baseTaper = map(y, 0, cloudHeight - 1, 0.2, 1.0);
      const taper = baseTaper * taperVariance + noiseFactor * 0.6 * (1 - taperVariance);
      const rowWidthVariance = floor(random(-3, 4));
      const effectiveWidth = max(3, floor(cloudWidth * taper) + rowWidthVariance);
      const xShift = floor(
        sin(y * 0.3 + randomOffset) * 3 + noise(randomOffset + y * 0.2) * 5
      ) * BLOCK_SIZE;

      for (let x = -effectiveWidth; x <= effectiveWidth; x++) {
        pg.fill(CLOUD_COLOR);
        pg.noStroke();
        pg.rect(baseX + x * BLOCK_SIZE + xShift, baseY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

//------------------------------------------------------------
// GRASS
//------------------------------------------------------------
function drawPixelGrass(pg) {
  const grassColors = [
    color(46, 204, 64),
    color(34, 180, 50),
    color(55, 160, 60),
    color(40, 190, 70),
    color(30, 140, 40)
  ];

  bottomWave.length = 0;
  const detailFreq = 0.15;       // chunkiness
  const detailAmp  = BLOCK_SIZE * 6;

  // Wave edge where grass meets dirt
  for (let x = 0; x < pg.width; x += BLOCK_SIZE) {
    let waveY = GROUND_HEIGHT - floor(noise(x * detailFreq) * detailAmp);
    bottomWave.push(waveY);
  }

  // Fill grass pixels
  pg.noStroke();
  for (let x = 0; x < pg.width; x += BLOCK_SIZE) {
    const waveY = bottomWave[x / BLOCK_SIZE];
    for (let y = 0; y < waveY; y += BLOCK_SIZE) {
      const index = floor(noise(x * 0.05, y * 0.05) * grassColors.length);
      pg.fill(grassColors[index]);
      pg.rect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    }
  }

  // Tufts (animated slightly by frameCount; okay since we redraw rarely)
  for (let i = 0; i < 35; i++) {
    const baseX = floor(random(pg.width / BLOCK_SIZE)) * BLOCK_SIZE;
    const baseY = bottomWave[baseX / BLOCK_SIZE] - BLOCK_SIZE;

    const tuftHeight = floor(random(3, 7));
    const swayPhase = random(1000);

    for (let j = 0; j < tuftHeight; j++) {
      const sway = sin((frameCount + swayPhase) * 0.02) * 1.0;
      const colorIndex = floor(random(grassColors.length));
      pg.fill(grassColors[colorIndex]);

      const bladeX = baseX + floor(sway);
      const bladeY = baseY - j * BLOCK_SIZE;
      pg.rect(bladeX, bladeY, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}

//------------------------------------------------------------
// TREES (into buffer)
//------------------------------------------------------------
function drawTreesInto(pg) {
  const treeColors = [
    color(34, 139, 34),
    color(50, 160, 50),
    color(25, 120, 35)
  ];
  const trunkColor = color(80, 50, 20);
  const numTrees = 12;

  pg.clear();

  for (let i = 0; i < numTrees; i++) {
    const treeX = floor(random(pg.width / BLOCK_SIZE)) * BLOCK_SIZE;
    const baseY = bottomWave[treeX / BLOCK_SIZE];

    // Trunk
    const trunkHeight = floor(random(1, 3));
    pg.fill(trunkColor);
    for (let j = 0; j < trunkHeight; j++) {
      pg.rect(treeX, baseY - j * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }

    // Canopy
    const canopyWidth  = floor(random(2, 4));
    const canopyHeight = floor(random(2, 3));
    const canopyColor  = treeColors[floor(random(treeColors.length))];

    for (let y = 0; y < canopyHeight; y++) {
      for (let x = -canopyWidth; x <= canopyWidth; x++) {
        if (random() < 0.75) {
          pg.fill(canopyColor);
          pg.rect(
            treeX + x * BLOCK_SIZE,
            baseY - trunkHeight * BLOCK_SIZE - y * BLOCK_SIZE,
            BLOCK_SIZE, BLOCK_SIZE
          );
        }
      }
    }
  }
}

//------------------------------------------------------------
// DIRT (into buffer)
//------------------------------------------------------------
function drawPixelDirtInto(pg) {
  const bandHeight = 4;
  const colors = [
    color(120, 72, 32), color(110, 60, 25),
    color(90, 50, 20),  color(60, 30, 10),
    color(40, 20, 5),   color(30, 15, 3),
    color(20, 10, 2),   color(15, 5, 1),
  ];
  const bandsPerColor = 64;

  pg.noStroke();

  for (let y = 0; y < pg.height; y += bandHeight) {
    const bandNum = int(y / bandHeight);
    const colorIndex = floor(bandNum / bandsPerColor) % colors.length;
    pg.fill(colors[colorIndex]);
    pg.rect(0, y, pg.width, bandHeight);
  }

  // Pebbles (transform to local y)
  pg.fill(180);
  const globalStartY = SKY_HEIGHT + GROUND_HEIGHT;
  for (const pebble of dirtPebbles) {
    const localY = pebble.y - globalStartY;
    if (localY >= 0 && localY < pg.height) {
      pg.rect(pebble.x, localY, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}

//------------------------------------------------------------
// PEBBLES
//------------------------------------------------------------
function generatePebbles() {
  const startY = SKY_HEIGHT + GROUND_HEIGHT;
  const endY   = startY + DIRT_HEIGHT;
  dirtPebbles = [];
  for (let i = 0; i < 80; i++) {
    let px = floor(random(windowWidth / BLOCK_SIZE)) * BLOCK_SIZE;
    let py = floor(random((endY - startY) / BLOCK_SIZE)) * BLOCK_SIZE + startY;
    dirtPebbles.push({ x: px, y: py });
  }
}

//------------------------------------------------------------
// FIELD CLASS (unchanged usage; relies on your Line class)
//------------------------------------------------------------
class Field {
  constructor(yOffset = 0) {
    this.xNoiseFreq = 0.0039;
    this.yNoiseFreq = 0.0073;
    this.xNoiseStep = 1.1;
    this.yNoiseStep = 1.1;
    this.numPoints = 150;
    this.echoes = 10;
    this.echoArray = [];
    this.yOffset = yOffset;
    this.counter = 0;
    this.secondsPerFrame = 6;
  }

  draw() {
    if (this.counter === this.secondsPerFrame) {
      this.counter = 0;
      let xIncrement = windowWidth * this.echoes / this.numPoints;
      let newLine = new Line(this.xNoiseFreq, this.yNoiseFreq, xIncrement, this.yOffset);
      this.echoArray.push(newLine);
      this.echoArray.splice(0, this.echoArray.length - this.echoes);
    } else {
      this.counter++;
    }

    let a = 30;
    for (let i = 0; i < this.echoArray.length; i++) {
      stroke(0, 136, 204, a);
      this.echoArray[i].draw();
      if (i < this.echoArray.length / 2) {
        a += int(400 / this.echoArray.length);
      } else {
        a -= int(400 / this.echoArray.length);
      }
    }
  }
}

//------------------------------------------------------------
// UTIL: debounce
//------------------------------------------------------------
function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
