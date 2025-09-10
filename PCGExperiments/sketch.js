const animationStride = 8; // number of frames to cycle through all animated tiles

const tilemapSketch = (p) => {
  let tilesetImage;
  let grid = [];
  let numCols, numRows;
  let seed = Math.floor(Math.random() * 1000000); // ✅ Now randomized

  p.preload = () => {
    tilesetImage = p.loadImage(
      "https://cdn.glitch.com/723f2e81-515d-43ff-b44a-4e161e0451ed%2Ftileset.png?v=1611598428661"
    );
  };

  p.setup = () => {
  const blockSize = 16;
  const pageHeight = document.documentElement.scrollHeight; // <--
  numCols = Math.ceil(p.windowWidth / blockSize);
  numRows = Math.ceil(pageHeight / blockSize);
  p.createCanvas(numCols * blockSize, numRows * blockSize).parent("canvas-container");
  p.noSmooth();

  p.randomSeed(seed);
  p.noiseSeed(seed);
  grid = generateGrid(numCols, numRows);
};

p.draw = () => {
  p.randomSeed(seed);
  const frame = p.frameCount % animationStride;
  drawGrid(grid, frame);
};

  p.windowResized = () => {
  const blockSize = 16;
  const pageHeight = document.documentElement.scrollHeight; // <--
  numCols = Math.ceil(p.windowWidth / blockSize);
  numRows = Math.ceil(pageHeight / blockSize);
  p.resizeCanvas(numCols * blockSize, numRows * blockSize);
  grid = generateGrid(numCols, numRows);
};

  function generateGrid(cols, rows) {
    const g = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const outer = p.noise(i / 40, j / 40);
        if (Math.abs(outer - 0.5) < 0.03) {
          row.push("w");
        } else {
          const inner = p.noise(i / 20, j / 20);
          row.push(inner > 0.5 ? ":" : ".");
        }
      }
      g.push(row);
    }

    // Sprinkle trees
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (g[i][j] === "." && p.random() < 0.1) {
          g[i][j] = "t";
        }
      }
    }
    return g;
  }

  function drawGrid(grid) {
    const g = 10;
    const t = p.millis() / 20000.0; // slow water animation by increasing divisor (3 sec per cycle)

    p.background(128);
    p.noStroke();

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j] === "w") {
          // Animate water tiles slowly
          placeTile(i, j, (4 * Math.pow(p.noise(t / 10, i, j / 4 + t), 2)) | 0, 14);
        } else {
          // Draw a static base tile for where water would be (optional)
          // placeTile(i, j, 0, 14);
          // Or skip this if you want no water animation outside 'w' tiles
        }

        if (gridCheck(grid, i, j, ":")) {
          placeTile(i, j, (4 * Math.pow(p.random(), g)) | 0, 12);
        } else {
          drawContext(grid, i, j, "w", 9, 12, true);
        }

        if (gridCheck(grid, i, j, ".")) {
          placeTile(i, j, (4 * Math.pow(p.random(), g)) | 0, 15, 0);
        } else {
          drawContext(grid, i, j, ".", 4, 15);
        }

        if (grid[i][j] === "t") {
          placeTile(i, j, 16, 17);
        }
      }
    }
  }

  function drawContext(grid, i, j, target, dti, dtj, invert = false) {
    let code = gridCode(grid, i, j, target);
    if (invert) code = ~code & 0xf;
    const [ti, tj] = lookup[code];
    placeTile(i, j, dti + ti, dtj + tj);
  }

  function gridCode(grid, i, j, target) {
    return (
      (gridCheck(grid, i - 1, j, target) << 0) +
      (gridCheck(grid, i, j - 1, target) << 1) +
      (gridCheck(grid, i, j + 1, target) << 2) +
      (gridCheck(grid, i + 1, j, target) << 3)
    );
  }

  function gridCheck(grid, i, j, target) {
    return i >= 0 && i < grid.length && j >= 0 && j < grid[i].length && grid[i][j] === target;
  }

  function placeTile(i, j, ti, tj) {
    p.image(tilesetImage, 16 * j, 16 * i, 16, 16, 8 * ti, 8 * tj, 8, 8);
  }

  const lookup = [
    [1, 1], [1, 0], [0, 1], [0, 0],
    [2, 1], [2, 0], [1, 1], [1, 0],
    [1, 2], [1, 1], [0, 2], [0, 1],
    [2, 2], [2, 1], [1, 2], [1, 1]
  ];
};

// Launch it
new p5(tilemapSketch);
