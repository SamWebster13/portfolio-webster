function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


function draw() {
  background(120); // Grey background

  drawHazardTape(0, true);                      // Left side
  drawHazardTape(width - 50, false);            // Right side
  drawGirder(0);                                 // Top
  drawGirder(height - 40);                      // Bottom

  drawSign();                    // Step 4 – drawn on top
}

function drawHazardTape(x, isLeft) {
  push();
  translate(x, 0);
  noStroke();
  for (let y = 0; y < height; y += 40) {
    fill((y / 40) % 2 === 0 ? 'yellow' : 'black');
    if (isLeft) {
      quad(0, y, 40, y + 10, 40, y + 50, 0, y + 40);
    } else {
      quad(0, y + 10, 40, y, 40, y + 40, 0, y + 50);
    }
  }
  pop();
}

function drawGirder(y) {
  push();
  translate(0, y);
  fill(90);
  stroke(0);
  rect(760, 18, width, 50);
  for (let x = 20; x < width; x += 60) {
    fill(60);
    ellipse(x, 20, 20, 20); // Rivets
  }
  pop();
}

function drawSign() {
  const signWidth = 420;
  const signHeight = 80;
  const centerX = width / 2;
  const centerY = height / 2;

  // BACKGROUND BOX
  rectMode(CENTER);
  fill(255, 255, 180);
  stroke(60);
  strokeWeight(4);
  rect(centerX, centerY, signWidth, signHeight, 10);

  // SIGN TEXT
  textAlign(CENTER, CENTER);
  textSize(28);
  fill(0);
  stroke('yellow');
  strokeWeight(3);
  text("🚧 UNDER CONSTRUCTION 🚧", centerX, centerY);
}