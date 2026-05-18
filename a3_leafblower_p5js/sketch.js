// This is a basic web serial template for p5.js using the Makeability Lab
// serial.js library:
// https://github.com/makeabilitylab/p5js/blob/master/_libraries/serial.js
//
// See a basic example of how to use the library here:
// https://editor.p5js.org/jonfroehlich/sketches/5Knw4tN1d
//
// For more information, see:
// https://makeabilitylab.github.io/physcomp/communication/p5js-serial
// 
// By Jon E. Froehlich
// @jonfroehlich
// http://makeabilitylab.io/
//


let pHtmlMsg;
let serialOptions = { baudRate: 115200  };
let serial;

// Serial variables
let joyX = 0;
let joyY = 0;
let btn1Down = 1;
let btn2Down = 1;
let leafMeter = 0;
let sendInterval = 100;
let lastSendTime = 0;  // send info to microcontroller

// Render variables
let player;
let speed;
let leaves = [];
let maxLeaves = 300;
let spawnInterval = 100;
let lastSpawnTime = 0;

class Player {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.angle = 0;
    this.nozzleLength = 8;
    this.nozzleWidth = 10;
    this.nozzleTipRadius = 12;
  }
    
  // Nozzle angle
  updateAngle(joyX, joyY) {
    let x = map(joyX, 0, 1, -1, 1);
    let y = map(joyY, 0, 1, -1, 1);

    let deadzone = 0.1;
    if (abs(x) > deadzone || abs(y) > deadzone) {
      this.angle = atan2(x, y);
    }
  }
  
  // Move player
  updatePos(joyX, joyY) {
    let x = map(joyX, 0, 1, -1, 1);
    let y = map(joyY, 0, 1, -1, 1);
    let dir = createVector(0,0);
    dir.x += y;
    dir.y += x;
    dir.normalize();
    dir.mult(speed);

    let deadzone = 0.2;
    if (abs(x) > deadzone || abs(y) > deadzone) {
      // weird math due to orientation of joystick
      this.x += dir.x;
      this.y += dir.y;
    }
    // this.x = constrain(this.x, this.radius, width - this.radius);
    // this.y = constrain(this.y, this.radius, height - this.radius);
    
    if (this.x > width + this.radius) {
      this.x = 0 - this.radius;
    } else if (this.x < 0 - this.radius) {
      this.x = width + this.radius;
    }
    
    if (this.y > height + this.radius) {
      this.y = 0 - this.radius;
    } else if (this.y < 0 - this.radius) {
      this.y = height + this.radius;
    }
  }
    
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);

    // body
    stroke(0);
    strokeWeight(2);
    fill(205, 32, 39);
    circle(0, 0, this.radius * 2);
      
    // nozzle base
    let nozzleX = this.radius * 0.8;
    let nozzleY = this.radius * 0.4;
    
    // nozzle tube
    stroke(100);
    strokeWeight(this.nozzleWidth);
    line(nozzleX, nozzleY, nozzleX + this.nozzleLength, nozzleY);
    
    // nozzle opening
    let tipX = nozzleX + this.nozzleLength;
    let flareWidth = 8;
    let flareDepth = 10;
    noStroke();
    fill(100);
    triangle(
      tipX - 5, nozzleY,
      tipX + flareDepth, nozzleY + 10,
      tipX + flareDepth, nozzleY - 10
    )
    
    pop();
  }
}

class Leaf {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.x = random(width);
    this.y = random(height);
    this.size = random(12, 28);
    this.angle = random(TWO_PI);
    this.vx = 0;
    this.vy = 0;
    this.blown = false;
    
    // colors - red -> orange -> yellow
    let palette = [
      color(180, 30, 20),
      color(210, 60, 10),
      color(220, 100, 10),
      color(230, 140, 10),
      color(220, 190, 20),
    ];
    this.color = random(palette);
  }
  
  isOffCanvas() {
    let margin = this.size * 2;
    return this.x < -margin || this.x > width + margin || this.y < -margin || this.y > height + margin;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // friction
    this.vx *= 0.95;
    this.vy *= 0.95;
  }
  
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    scale(this.size / 20);
    
    fill(this.color)
    noStroke();
    
    // maple leaf built from triangles + bezier lobes
    // center stem
    stroke(red(this.color) * 0.6, green(this.color) * 0.6, blue(this.color) * 0.6);
    strokeWeight(1);
    line(0, 10, 0, -10);

    noStroke();
    fill(this.color);

    // center lobe — top point
    triangle(0, -14, -5, -4, 5, -4);

    // upper left lobe
    triangle(-4, -6, -12, -10, -4, 2);

    // upper right lobe
    triangle(4, -6, 12, -10, 4, 2);

    // lower left lobe
    triangle(-3, 0, -10, -2, -3, 6);

    // lower right lobe
    triangle(3, 0, 10, -2, 3, 6);

    // body fill — center mass
    fill(this.color);
    noStroke();
    ellipse(0, 0, 10, 12);

    // stem
    stroke(red(this.color) * 0.6, green(this.color) * 0.6, blue(this.color) * 0.6);
    strokeWeight(1.5);
    line(0, 6, 0, 12);
    
    pop();
  }
}

function drawCone() {
  push();
  translate(player.x, player.y);
  
  let coneRange = 150;
  let coneAngle = PI / 4;
  
  noFill();
  stroke(255, 255, 255);
  strokeWeight(1);
  
  let leftAngle = player.angle - coneAngle;
  let rightAngle = player.angle + coneAngle;
  line(0, 0, cos(leftAngle) * coneRange, sin(leftAngle) * coneRange);
  line(0, 0, cos(rightAngle) * coneRange, sin(rightAngle) * coneRange);
  
  arc(0, 0, coneRange * 2, coneRange * 2, leftAngle, rightAngle);
  
  pop();
}

function blowLeaves() {
  let coneRange = 150;
  let coneAngle = PI / 4;
  
  for (let leaf of leaves) {
    let dx = leaf.x - player.x;
    let dy = leaf.y - player.y;
    let dist = sqrt(dx * dx + dy * dy);
    
    if (dist > coneRange) continue; // leaf too far
    
    // angle from player to leaf
    let angleToLeaf = atan2(dy, dx);
    
    // difference btween facing angle and angle to leaf
    let angleDiff = atan2(sin(angleToLeaf - player.angle), cos(angleToLeaf - player.angle));
    
    if (abs(angleDiff) < coneAngle) {
      // leaf in cone - closer results in larger push
      let force = map(dist, 0, coneRange, 0.5, 0.1);
      leaf.vx += cos(player.angle) * force;
      leaf.vy += sin(player.angle) * force;
    }
  }
}

function setup() {
  createCanvas(640, 480);

  // Setup Web Serial using serial.js
  serial = new Serial();
  serial.on(SerialEvents.CONNECTION_OPENED, onSerialConnectionOpened);
  serial.on(SerialEvents.CONNECTION_CLOSED, onSerialConnectionClosed);
  serial.on(SerialEvents.DATA_RECEIVED, onSerialDataReceived);
  serial.on(SerialEvents.ERROR_OCCURRED, onSerialErrorOccurred);

  // If we have previously approved ports, attempt to connect with them
  serial.autoConnectAndOpenPreviouslyApprovedPort(serialOptions);

  // Add in a lil <p> element to provide messages. This is optional
  pHtmlMsg = createP("Click anywhere on this page to open the serial connection dialog");
  pHtmlMsg.style('color', 'deeppink');
  
  // Spawn player
  player = new Player(width / 2, width / 2, 16);
  speed = 3;
  
  // Spawn initial leaves
  for (let i = 0; i < 8; i++) {
    leaves.push(new Leaf());
  }
}

function draw() {
  background(0, 255, 0);
  leafMeter = constrain(leafMeter, 0, 100);
  currMillis = millis();
  
  // Spawn leaf on timer frameCount % spawnInterval === 0 &&
  if (currMillis - lastSpawnTime > spawnInterval && leaves.length < maxLeaves) {
    leaves.push(new Leaf());
    lastSpawnTime = currMillis;
    // leafMeter -= 3;  // gradually decrease LED
  }
  
  // Update and draw, remove off canvas leaves
  for (let i = leaves.length - 1; i >= 0; i--) {
    leaves[i].update();
    leaves[i].draw();
    if (leaves[i].isOffCanvas()) {
      leaves.splice(i, 1);
      leafMeter += 5;  // increase LED for leafs blown off
    }
  }
  
  // Player handling
  player.updateAngle(joyX, joyY);
  player.updatePos(joyX, joyY);
  player.draw();
  
  // Blow on handling
  if (!btn1Down) {
    // drawCone();
    blowLeaves();
  }
  
  // Player speed on button
  speed = btn2Down ? 2 : 4;
  
  // Send info to microcontroller
  if (currMillis - lastSendTime > sendInterval) {
    if (leafMeter > 0) {
      serial.writeLine(leafMeter.toString());
      leafMeter = 0;
    }
    lastSendTime = currMillis;
  }
}

/**
 * Callback function by serial.js when there is an error on web serial
 * 
 * @param {} eventSender 
 */
 function onSerialErrorOccurred(eventSender, error) {
  console.log("onSerialErrorOccurred", error);
  pHtmlMsg.html(error);
}

/**
 * Callback function by serial.js when web serial connection is opened
 * 
 * @param {} eventSender 
 */
function onSerialConnectionOpened(eventSender) {
  console.log("onSerialConnectionOpened");
  pHtmlMsg.html("Serial connection opened successfully");
}

/**
 * Callback function by serial.js when web serial connection is closed
 * 
 * @param {} eventSender 
 */
function onSerialConnectionClosed(eventSender) {
  console.log("onSerialConnectionClosed");
  pHtmlMsg.html("onSerialConnectionClosed");
}

/**
 * Callback function serial.js when new web serial data is received
 * 
 * @param {*} eventSender 
 * @param {String} newData new data received over serial
 */
function onSerialDataReceived(eventSender, newData) {
  console.log("onSerialDataReceived", newData);
  pHtmlMsg.html("onSerialDataReceived: " + newData);
  
  data = newData.split(',');
  x_out = parseFloat(data[0]);
  y_out = parseFloat(data[1]);
  btn1Down = parseInt(data[2]);
  btn2Down = parseInt(data[3]);
  
  joyX = parseFloat(x_out);
  joyY = parseFloat(y_out);
  // let redXVal = map(curXSerialVal, 0, 1, 0, 255);
  // let redYVal = map(curYSerialVal, 0, 1, 0, 255);
  // stroke(redXVal, 0, 0);
}

/**
 * Called automatically by the browser through p5.js when mouse clicked
 */
function mouseClicked() {
  if (!serial.isOpen()) {
    serial.connectAndOpen(null, serialOptions);
  }
}