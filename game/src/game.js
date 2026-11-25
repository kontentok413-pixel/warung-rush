// Warung Rush: run a small Indonesian warung. Orders land on the board,
// you tap ingredients on the counter to build the dish on the plate, then
// serve it before the ticket's timer runs out. Keyboard: 1-6 ingredients,
// Space serves, Enter starts, R restarts. Mouse: click everything.
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 960;
const H = 540;

const params = new URLSearchParams(location.search);
const shot = params.get('shot'); // start | play | end — fixed scenes for screenshots

let state = 'title'; // title | playing | over
let score = 0;
let served = 0;
let missed = 0;
let combo = 0;
let dayLeft = DAY_LENGTH;
let plate = []; // ingredient ids on the plate, in the order added
let orders = []; // { dish, left, max }
let spawnIn = 0;
let flash = '';
let flashUntil = 0;
let buttons = []; // { x, y, w, h, action, label } rebuilt every frame
let hover = null;
let now = 0;

function newOrder(dishId, left) {
  const dish = dishById(dishId);
  return { dish: dish, left: left, max: ORDER_TIME };
}

function resetDay() {
  score = 0;
  served = 0;
  missed = 0;
  combo = 0;
  dayLeft = DAY_LENGTH;
  plate = [];
  orders = [];
  spawnIn = 2;
  flash = '';
  state = 'playing';
  addOrder();
  addOrder();
}

function addOrder() {
  if (orders.length >= MAX_ORDERS) return;
  const dish = DISHES[Math.floor(Math.random() * DISHES.length)];
  orders.push(newOrder(dish.id, ORDER_TIME));
}

// Fixed scenes for screenshots: the same code, no randomness.
function applyShot() {
  if (shot === 'start') {
    state = 'title';
  } else if (shot === 'play') {
    state = 'playing';
    score = 150;
    served = 2;
    dayLeft = 75;
    plate = ['nasi', 'telur']; // Nasi Goreng, two of three in — mid-assembly
    orders = [newOrder('nasi-goreng', 18), newOrder('mie-goreng', 12)];
    orders[0].max = ORDER_TIME;
    orders[1].max = ORDER_TIME;
  } else if (shot === 'end') {
    state = 'playing';
    score = 320;
    served = 4;
    dayLeft = 45;
    plate = ['nasi', 'telur', 'kecap']; // full plate, ready to serve
    orders = [newOrder('nasi-goreng', 20), newOrder('ayam-geprek', 15)];
    flash = 'Plate ready — serve it!';
    flashUntil = 999999;
  }
}

function toggleIngredient(id) {
  if (state !== 'playing') return;
  const at = plate.indexOf(id);
  if (at >= 0) plate.splice(at, 1);
  else if (plate.length < 3) plate.push(id);
}

function servePlate() {
  if (state !== 'playing' || plate.length === 0) return;
  const match = orders.find(function (order) {
    return order.dish.needs.length === plate.length &&
      order.dish.needs.every(function (need) { return plate.indexOf(need) >= 0; });
  });
  if (match) {
    const bonus = Math.round(match.left) * 2;
    const gained = match.dish.price + bonus;
    score += gained;
    served += 1;
    combo += 1;
    flash = 'Served! +' + gained + (combo > 1 ? '  (combo x' + combo + ')' : '');
    orders.splice(orders.indexOf(match), 1);
  } else {
    score = Math.max(0, score - 10);
    combo = 0;
    flash = 'Wrong dish! -10';
  }
  flashUntil = now + 1.6;
  plate = [];
}

function update(dt) {
  if (state !== 'playing') return;
  dayLeft -= dt;
  if (dayLeft <= 0) {
    dayLeft = 0;
    state = 'over';
    return;
  }
  spawnIn -= dt;
  if (spawnIn <= 0) {
    addOrder();
    spawnIn = 7 + Math.random() * 4;
  }
  for (let i = orders.length - 1; i >= 0; i -= 1) {
    orders[i].left -= dt;
    if (orders[i].left <= 0) {
      orders.splice(i, 1);
      missed += 1;
      combo = 0;
      flash = 'Order missed!';
      flashUntil = now + 1.6;
    }
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawIngredientIcon(id, x, y, s) {
  const item = ingredientById(id);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = item.color;
  ctx.strokeStyle = item.dark;
  ctx.lineWidth = 2;
  if (id === 'nasi') {
    ctx.beginPath(); ctx.ellipse(0, 2, s * 0.42, s * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 0.08, s * 0.3, Math.PI, 0); ctx.fill(); ctx.stroke();
  } else if (id === 'mie') {
    ctx.lineWidth = 3;
    ctx.strokeStyle = item.dark;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, i * s * 0.18);
      ctx.bezierCurveTo(-s * 0.2, i * s * 0.18 - s * 0.14, s * 0.2, i * s * 0.18 + s * 0.14, s * 0.4, i * s * 0.18);
      ctx.stroke();
    }
  } else if (id === 'telur') {
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2a541';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'ayam') {
    ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.05, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f5f0e1';
    ctx.beginPath(); ctx.moveTo(s * 0.15, s * 0.15); ctx.lineTo(s * 0.42, s * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.05); ctx.lineTo(s * 0.45, s * 0.3); ctx.stroke();
  } else if (id === 'cabai') {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.1);
    ctx.quadraticCurveTo(0, s * 0.5, s * 0.4, -s * 0.25);
    ctx.quadraticCurveTo(0, s * 0.15, -s * 0.4, -s * 0.1);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3f7a2e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s * 0.32, -s * 0.25); ctx.quadraticCurveTo(s * 0.45, -s * 0.4, s * 0.3, -s * 0.45); ctx.stroke();
  } else if (id === 'kecap') {
    ctx.fillStyle = item.color;
    ctx.fillRect(-s * 0.2, -s * 0.15, s * 0.4, s * 0.45);
    ctx.fillRect(-s * 0.1, -s * 0.45, s * 0.2, s * 0.32);
    ctx.strokeRect(-s * 0.2, -s * 0.15, s * 0.4, s * 0.45);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(-s * 0.2, -s * 0.02, s * 0.4, s * 0.16);
  }
  ctx.restore();
}

function drawOrderTicket(order, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f5e6c8';
  roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#b98d4f';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2b1d16';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(order.dish.name, x + 12, y + 24);
  order.dish.needs.forEach(function (need, i) {
    drawIngredientIcon(need, x + 26 + i * 34, y + 42, 24);
  });
  const frac = Math.max(0, order.left / order.max);
  ctx.fillStyle = '#e0d0a8';
  roundRect(x + 12, y + h - 12, w - 24, 6, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.4 ? '#3fa34d' : '#d64541';
  roundRect(x + 12, y + h - 12, (w - 24) * frac, 6, 3);
  ctx.fill();
  ctx.fillStyle = '#2b1d16';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(Math.ceil(order.left) + 's', x + w - 12, y + 24);
  ctx.restore();
}

function drawKitchen() {
  ctx.fillStyle = '#2b1d16';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3a2418';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, 150, W, 12);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 330, W, 10);
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WARUNG RUSH', 20, 42);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Score ' + score + '   Served ' + served + '   Missed ' + missed, W - 20, 26);
  ctx.fillStyle = '#e0d0a8';
  ctx.fillRect(330, 44, 300, 10);
  ctx.fillStyle = dayLeft > 30 ? '#3fa34d' : '#d64541';
  ctx.fillRect(330, 44, 300 * Math.max(0, dayLeft / DAY_LENGTH), 10);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Day ends in ' + Math.ceil(dayLeft) + 's', 480, 40);
}

function drawOrderBoard() {
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ORDER BOARD', 20, 82);
  for (let i = 0; i < MAX_ORDERS; i += 1) {
    const x = 20 + i * 220;
    if (orders[i]) drawOrderTicket(orders[i], x, 86, 205, 62);
    else {
      ctx.strokeStyle = '#5b4632';
      ctx.setLineDash([5, 5]);
      roundRect(x, 86, 205, 62, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawCounter() {
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('INGREDIENTS — click or press 1-6', 20, 180);
  INGREDIENTS.forEach(function (item, i) {
    const x = 20 + i * 155;
    const y = 190;
    const w = 140;
    const h = 128;
    const onPlate = plate.indexOf(item.id) >= 0;
    ctx.fillStyle = onPlate ? '#ffe9a8' : '#fff3d6';
    roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = onPlate ? '#f2a541' : '#b98d4f';
    ctx.lineWidth = onPlate ? 4 : 2;
    ctx.stroke();
    drawIngredientIcon(item.id, x + w / 2, y + 48, 56);
    ctx.fillStyle = '#2b1d16';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, x + w / 2, y + 102);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8a7d5f';
    ctx.fillText('[' + item.key + ']', x + w / 2, y + 120);
    buttons.push({ x: x, y: y, w: w, h: h, action: 'ingredient', id: item.id });
  });
}

function drawPlate() {
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('YOUR PLATE', 20, 360);
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.ellipse(200, 425, 150, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b98d4f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(200, 425, 110, 32, 0, 0, Math.PI * 2);
  ctx.stroke();
  plate.forEach(function (id, i) {
    drawIngredientIcon(id, 140 + i * 60, 425, 44);
  });
  if (plate.length === 0) {
    ctx.fillStyle = '#8a7d5f';
    ctx.font = 'italic 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('empty — add ingredients', 200, 429);
  }
  const bx = 560;
  const by = 380;
  const bw = 180;
  const bh = 84;
  const ready = plate.length === 3;
  ctx.fillStyle = ready ? '#3fa34d' : '#7a8a7a';
  roundRect(bx, by, bw, bh, 12);
  ctx.fill();
  if (ready) {
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAJIKAN', bx + bw / 2, by + 38);
  ctx.font = '13px sans-serif';
  ctx.fillText('[Space]', bx + bw / 2, by + 62);
  buttons.push({ x: bx, y: by, w: bw, h: bh, action: 'serve' });
  if (flash && now < flashUntil) {
    ctx.fillStyle = '#f2c14e';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(flash, 20, 500);
  }
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Build the dish on the plate, then serve it to the matching ticket. Wrong dish: -10.', 20, 525);
}

function drawTitle() {
  ctx.fillStyle = 'rgba(29, 19, 12, 0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WARUNG RUSH', W / 2, 180);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '20px sans-serif';
  ctx.fillText('A fast-paced Indonesian warung cooking game', W / 2, 220);
  ctx.font = '16px sans-serif';
  ctx.fillText('Read the tickets. Tap ingredients. Serve before the timer runs out.', W / 2, 260);
  ctx.fillText('Keys 1-6 add ingredients · Space serves · R restarts', W / 2, 290);
  ctx.fillStyle = '#3fa34d';
  roundRect(W / 2 - 130, 330, 260, 56, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('START COOKING', W / 2, 366);
  buttons.push({ x: W / 2 - 130, y: 330, w: 260, h: 56, action: 'start' });
}

function drawOver() {
  ctx.fillStyle = 'rgba(29, 19, 12, 0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f2c14e';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DAY OVER!', W / 2, 170);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '24px sans-serif';
  ctx.fillText('Score: ' + score + '   ·   Served: ' + served + '   ·   Missed: ' + missed, W / 2, 220);
  const best = served >= 8 ? 'Warung legend! The queue never stood a chance.' :
    served >= 4 ? 'Solid shift! The regulars will be back.' :
    'A slow day — the wok is still warm. Try again!';
  ctx.font = '18px sans-serif';
  ctx.fillText(best, W / 2, 260);
  ctx.fillStyle = '#3fa34d';
  roundRect(W / 2 - 130, 310, 260, 56, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('COOK AGAIN [R]', W / 2, 346);
  buttons.push({ x: W / 2 - 130, y: 310, w: 260, h: 56, action: 'start' });
}

function render() {
  buttons = [];
  drawKitchen();
  drawOrderBoard();
  drawCounter();
  drawPlate();
  if (state === 'title') drawTitle();
  else if (state === 'over') drawOver();
}

function clickAt(mx, my) {
  for (let i = buttons.length - 1; i >= 0; i -= 1) {
    const b = buttons[i];
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      if (b.action === 'ingredient') toggleIngredient(b.id);
      else if (b.action === 'serve') servePlate();
      else if (b.action === 'start') resetDay();
      return;
    }
  }
}

canvas.addEventListener('click', function (event) {
  const rect = canvas.getBoundingClientRect();
  clickAt(
    (event.clientX - rect.left) * (W / rect.width),
    (event.clientY - rect.top) * (H / rect.height),
  );
});

document.addEventListener('keydown', function (event) {
  if (event.key >= '1' && event.key <= '6') {
    toggleIngredient(INGREDIENTS[Number(event.key) - 1].id);
  } else if (event.key === ' ') {
    event.preventDefault();
    servePlate();
  } else if (event.key === 'Enter') {
    if (state !== 'playing') resetDay();
  } else if (event.key === 'r' || event.key === 'R') {
    resetDay();
  }
});

applyShot();

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  now = t / 1000;
  if (!shot) update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
