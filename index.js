const scoreEl = document.querySelector('.score')

const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const canvasClientRect = canvas.getBoundingClientRect()
const bodyClientRect = document.body.getBoundingClientRect()

canvas.width = 1024
canvas.height = 576

const playerWidth = 40
const playerHeight = 40

const bulletVelocity = -5

class Player {
  constructor() {
    this.width = playerWidth
    this.height = playerHeight
    this.position = {
      x: canvas.width / 2 - this.width / 2,
      y: canvas.height - this.height - 10
    }
    this.velocity = {
      x: 0,
      y: 0
    }
  }
  draw() {
    c.fillStyle = 'whitesmoke'
    c.fillRect(this.position.x, this.position.y, this.width, this.height)
  }

  update() {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }
}

class Projectile {
  constructor({ velocity }) {
    this.radius = 4
    this.position = {
      x: player.position.x + player.width / 2,
      y: player.position.y + player.height / 2
    }
    this.velocity = velocity
  }
  draw() {
    c.beginPath();
    c.fillStyle = 'whitesmoke'
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    c.fill();
    c.closePath()
  }
  update() {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }
}

class Enemy {
  constructor() {
    const size = randomNum(10, 50)
    let speed

    if (size >= 10 && size < 20)
      speed = 10
    else if (size < 30)
      speed = 8
    else if (size < 40)
      speed = 6
    else
      speed = 4

    // spawning position ( x axis )
    let xPosSpawn = 0

    this.radius = size

    if (player.position.x + player.width >= canvas.width)
      xPosSpawn = canvas.width - this.radius - 2
    else
      xPosSpawn = player.position.x + player.width / 2 + this.radius + 2

    this.position = {
      x: xPosSpawn,
      y: this.radius
    }
    this.velocity = {
      x: randomNum(-2, 2),
      y: speed
    }
    this.color = colors[randomNum(0, 4)]
  }
  draw() {
    c.save()
    c.beginPath();
    c.fillStyle = this.color
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    c.fill();
    c.closePath()
    c.restore()
  }
  update() {
    this.draw()
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    if (this.position.x + this.radius >= canvas.width || this.position.x - this.radius <= 0) {
      this.velocity.x = -this.velocity.x;
    }
    if (this.position.y + this.radius >= canvas.height || this.position.y - this.radius <= 0) {
      this.velocity.y = -this.velocity.y;
    }
  }
}

class Particle {
  constructor({ position, velocity, radius, color, fades }) {
    this.position = position;
    this.velocity = velocity;
    this.radius = radius;
    this.color = color;
    this.opacity = 1;
    this.fades = fades;
  }
  draw() {
    c.save();
    c.globalAlpha = this.opacity;
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    c.fillStyle = this.color;
    c.fill();
    c.closePath();
    c.restore();
  }
  update() {
    this.draw();
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    if (this.fades)
      this.opacity -= 0.01;
  }
}

class Gun {
  constructor({ position }) {
    this.position = position
    this.width = 35
    this.height = 15
    this.angle = 0
  }
  draw() {
    c.save();
    c.translate(this.position.x, this.position.y);
    c.rotate(this.angle);
    c.fillStyle = 'grey';
    c.fillRect(this.width / 2 - this.width / 2, this.height / -2, this.width, this.height);
    c.restore();
  }
  update() {
    this.draw()
    this.angle = Math.atan2(mouse.y - this.position.y, mouse.x - this.position.x)
    this.position.x = player.position.x + player.width / 2
    this.position.y = player.position.y + player.height / 2
  }
}

// ======================================== Main ===================================================
const colors = ["#845EC2", "#00C9A7", "#C4FCEF", "#93F8B3", "#FF8066"];
const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

let spawningInterval = 100

const GAME = {
  OVER: false,
  ACTIVE: true,
  PAUSED: false
}

//  GAME OBJECTS ===============================
var player = new Player()
var gun = new Gun({
  position: {
    x: player.position.x + player.width / 2,
    y: player.position.y + player.height / 2
  }
})
var projectiles = []
var enemies = []
var particles = []

let score = 0

let frames = 0

const mouse = {
  x: 0,
  y: 0
}

const held_directions = []

const directions = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
}

const keys = {
  KeyW: directions.up,
  KeyA: directions.left,
  KeyD: directions.right,
  KeyS: directions.down
}

function init() {
  player = new Player()
  gun = new Gun({
    position: {
      x: player.position.x + player.width / 2,
      y: player.position.y + player.height / 2
    }
  })
  projectiles = []
  enemies = []
  particles = []
  score = 0
  frame = 0
  scoreEl.textContent = score
}

function start() {
  init()
  animate()
}

function isColliding(obj1, obj2) {
  if (
    obj1.position.x + obj1.radius >= obj2.position.x - obj2.radius &&
    obj1.position.x - obj1.radius <= obj2.position.x + obj2.radius &&
    obj1.position.y - obj1.radius <= obj2.position.y + obj2.radius &&
    obj1.position.y + obj1.radius >= obj2.position.y - obj2.radius
  ) {
    return true
  }
  return false
}

// source: https://stackoverflow.com/questions/65884620/detecting-collision-between-circle-and-square
function RectCircleColliding(circle, rect) {
  // distances between the circle's center and the rectangle's center
  var distX = Math.abs(circle.position.x - rect.position.x - rect.width / 2);
  var distY = Math.abs(circle.position.y - rect.position.y - rect.height / 2);

  // If the distance is greater than halfCircle + halfRect
  if (distX > (rect.width / 2 + circle.radius)) { return false; }
  if (distY > (rect.height / 2 + circle.radius)) { return false; }

  if (distX <= (rect.width / 2)) { return true; }
  if (distY <= (rect.height / 2)) { return true; }

  // Test for collision at rect corner
  var dx = distX - rect.width / 2;
  var dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function createParticles({ object, color, fades }) {
  for (let i = 0; i < 10; i++) {
    particles.push(
      new Particle({
        position: {
          x: object.position.x,
          y: object.position.y
        },
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        },
        radius: Math.random() * 3,
        color: color || "#BAA0DE",
        fades
      })
    );
  }
}

// FIRE OFF ANIMATION LOOP
let reqAnimId
init()
animate()
function animate() {
  if (!GAME.ACTIVE) {
    GAME.ACTIVE = true
    init()
  }

  reqAnimId = requestAnimationFrame(animate)
  if (GAME.PAUSED) {
    cancelAnimationFrame(reqAnimId)
    return
  }

  c.fillStyle = "rgb(0, 0, 0, 0.4)";
  c.fillRect(0, 0, canvas.width, canvas.height);

  // update projectiles
  projectiles.forEach((projectile, index) => {
    if (projectile.position.y <= 0) {
      setTimeout(() => {
        projectiles.splice(index, 1)
      }, 0)
    } else projectile.update()
  })

  // update particles
  particles.forEach((par, index) => {
    if (par.opacity <= 0) {
      setTimeout(() => {
        particles.splice(index, 1);
      }, 0);
    } else par.update();
  });

  // update enemy & checking collision
  enemies.forEach((enemy, i) => {
    enemy.update()
    projectiles.forEach((projectile, j) => {
      if (isColliding(projectile, enemy)) {
        // update score
        score += 10
        scoreEl.textContent = score
        // add particles
        createParticles({
          object: enemy,
          color: enemy.color,
          fades: true
        });
        if (enemy.radius - 10 > 10) {
          enemy.radius -= 10
          setTimeout(() => {
            projectiles.splice(j, 1)
          }, 0)
        } else {
          setTimeout(() => {
            enemies.splice(i, 1)
            projectiles.splice(j, 1)
          }, 0)
        }
      }
    })

    // enemy hitting player
    if (RectCircleColliding(enemy, player)) {
      console.log('you lose')
      GAME.ACTIVE = false
      GAME.OVER = true
    }
  })

  // update player
  player.update()
  player.velocity.x = 0
  player.velocity.y = 0

  // update gun
  gun.update()

  // controller
  const held_direction = held_directions[0]
  if (held_direction) {
    if (held_direction === directions.right)
      player.velocity.x = 3
    if (held_direction === directions.left)
      player.velocity.x = -3
    if (held_direction === directions.down)
      player.velocity.y = 3
    if (held_direction === directions.up)
      player.velocity.y = -3
  }

  // check limit
  if (player.position.x < 0)
    player.position.x = 0;
  if (player.position.x > canvas.width - player.width)
    player.position.x = canvas.width - player.width;
  if (player.position.y < 0)
    player.position.y = 0;
  if (player.position.y > canvas.height - player.height)
    player.position.y = canvas.height - player.height;

  // spawning enemies
  if (frames % spawningInterval === 0)
    enemies.push(new Enemy())
  frames++
}


// control gun
addEventListener('mousemove', (e) => {
  const rect = e.target.getBoundingClientRect();
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
})

addEventListener("click", (e) => {
  const rect = e.target.getBoundingClientRect();
  const xCoord = e.clientX - rect.left - (player.position.x + player.width / 2)
  const yCoord = e.clientY - rect.top - (player.position.y + player.height / 2)
  const angle = Math.atan2(yCoord, xCoord)
  const speed = 7
  projectiles.push(
    new Projectile({
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
    })
  )
})

addEventListener("keydown", (e) => {
  var dir = keys[e.code]
  if (dir && held_directions.indexOf(dir) === -1)
    held_directions.unshift(dir)

  if (e.code == 'Space') {
    GAME.PAUSED = !GAME.PAUSED
    if (!GAME.PAUSED)
      reqAnimId = requestAnimationFrame(animate)
  }
})

addEventListener("keyup", (e) => {
  var dir = keys[e.code];
  var index = held_directions.indexOf(dir);
  if (index > -1)
    held_directions.splice(index, 1)
})