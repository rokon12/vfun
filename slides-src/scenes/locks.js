const SEATS = 40;
const CUSTOMERS = 50;
const CHARGE_MS = 80;
const WIDE_MS = 3356;
// How long a thread holds the lock when all it does is read or change the seat count.
// Not measured; chosen so that 40 of them plus one 80 ms charge add up to the measured 92 ms.
const GLANCE_MS = 0.3;

const FULL = { span: 3450, major: 500, minor: 100 };
const ZOOM = { span: 100, major: 20, minor: 10 };

const LEAD_MS = 600;
const ZOOM_MS = 900;
const PAUSE_MS = 500;
const SLOW_REPLAY_MS = 3000;
const FADE_MS = 350;

const SEAT = { size: 30, pitch: 46, columns: 10 };
const LOCK_MIN_PX = 5;
const GHOST_OPACITY = 0.4;

const LEGEND = {
  wide: [
    ['is-wait', 'Waiting for the lock'],
    ['is-lock', 'Holds the lock, charging the card'],
    ['is-ok', 'Confirmed'],
    ['is-off', 'Turned away'],
  ],
  narrow: [
    ['is-wait', 'Waiting for the lock'],
    ['is-lock', 'Holds the lock'],
    ['', 'Charging, no lock held'],
    ['is-ok', 'Confirmed'],
    ['is-off', 'Turned away'],
  ],
};

// Customers are numbered in the order they get the lock. The first 40 get a seat: under the wide
// lock they hold it for the whole charge, under the narrow lock they let go and then charge.
// The last 10 only look at the seat count and leave.
function timeline(mode) {
  const hold = mode === 'wide' ? (WIDE_MS - (CUSTOMERS - SEATS) * GLANCE_MS) / SEATS : GLANCE_MS;
  const rows = [];
  let clock = 0;
  for (let index = 0; index < CUSTOMERS; index++) {
    const seated = index < SEATS;
    const lockAt = clock;
    clock += seated ? hold : GLANCE_MS;
    const done = seated && mode === 'narrow' ? clock + CHARGE_MS : clock;
    rows.push({ index, seated, lockAt, release: clock, done });
  }
  return { rows, lockEnd: clock, end: Math.max(...rows.map(row => row.done)) };
}

function layout(width, height) {
  const panelW = 450;
  const x0 = panelW + 110;
  const laneY = 8;
  const laneH = 26;
  const rowsY = laneY + laneH + 8;
  const pitch = Math.min(12, Math.floor((height - rowsY - 88) / CUSTOMERS));
  return {
    width, height, panelW, x0, laneY, laneH, rowsY, pitch,
    plotW: width - x0 - 80,
    rowsH: pitch * CUSTOMERS,
    barH: pitch - 2,
  };
}

function setShown(node, on) {
  node.setAttribute('visibility', on ? 'visible' : 'hidden');
}

function makeScale(lay, view) {
  const right = lay.x0 + lay.plotW;
  const at = ms => lay.x0 + (ms / view.span) * lay.plotW;
  return {
    at,
    inside: ms => at(ms) <= right + 0.5,
    stretch(rect, fromMs, toMs, minPx = 0) {
      const left = Math.min(at(fromMs), right);
      const end = Math.min(Math.max(at(toMs), left + minPx), right);
      const on = toMs > fromMs && end - left >= 0.5;
      setShown(rect, on);
      if (!on) return;
      rect.setAttribute('x', left);
      rect.setAttribute('width', end - left);
    },
  };
}

function buildSeats(svg, lay) {
  svg.append(
    Deck.svg('text', { class: 'lbl', x: 0, y: 34, text: SEATS + ' SEATS' }),
    Deck.svg('line', { class: 'rule', x1: 0, y1: 42, x2: lay.panelW, y2: 42 }));
  const seats = [];
  for (let i = 0; i < SEATS; i++) {
    const seat = Deck.svg('rect', {
      x: 2 + (i % SEAT.columns) * SEAT.pitch,
      y: 66 + Math.floor(i / SEAT.columns) * SEAT.pitch,
      width: SEAT.size,
      height: SEAT.size,
    });
    svg.append(seat);
    seats.push(seat);
  }
  return seats;
}

function seatsBottom() {
  return 66 + Math.ceil(SEATS / SEAT.columns - 1) * SEAT.pitch + SEAT.size;
}

function seatClass(row, now) {
  if (now >= row.done) return 'tok is-ok';
  return now >= row.release ? 'tok is-run' : 'box';
}

function buildReadout(label, unit, tone) {
  const win = Deck.el('span', { class: 'win' });
  const row = Deck.el('div', { class: 'ro ' + tone }, [
    Deck.el('span', { class: 'lb', text: label }),
    win,
    Deck.el('span', { class: 'un locks-unit', text: unit }),
  ]);
  let current = null;
  const set = text => {
    if (text === current) return;
    current = text;
    while (win.children.length > text.length) win.lastChild.remove();
    while (win.children.length < text.length) win.append(Deck.el('i'));
    [...text].forEach((ch, k) => {
      win.children[k].textContent = ch;
      win.children[k].className = ch === ',' ? 'dot locks-comma' : '';
    });
  };
  return { row, set };
}

function buildReadouts(root, lay) {
  const clock = buildReadout('Clock', 'ms', '');
  const confirmed = buildReadout('Confirmed', '', 'good');
  const turnedAway = buildReadout('Turned away', '', '');
  root.append(Deck.el('div', {
    class: 'readouts locks-readouts',
    style: { top: readoutsTop() + 'px', width: lay.panelW + 'px' },
  }, [clock.row, confirmed.row, turnedAway.row]));
  return { clock, confirmed, turnedAway };
}

function readoutsTop() {
  return seatsBottom() + 40;
}

function buildWideResult(root) {
  const plate = Deck.el('div', { class: 'cond', style: { left: 0, top: readoutsTop() + 3 * 78 + 22 + 'px' } }, [
    Deck.el('span', { text: 'Wide lock' }),
    Deck.el('b', { text: Deck.fmt(WIDE_MS) + ' ms' }),
  ]);
  root.append(plate);
  return plate;
}

function buildLegend(root, lay, mode) {
  root.append(Deck.el('div', { class: 'locks-legend', style: { top: lay.height - 38 + 'px' } },
    LEGEND[mode].map(([state, label]) => Deck.el('div', { class: 'key' }, [Deck.el('i', { class: state }), label]))));
}

function buildFrame(svg, lay) {
  const bottom = lay.rowsY + lay.rowsH;
  const right = lay.x0 + lay.plotW;
  svg.append(
    Deck.svg('rect', { class: 'plot-ground', x: lay.x0, y: lay.rowsY, width: lay.plotW, height: lay.rowsH }),
    Deck.svg('text', {
      class: 'plot-label', 'text-anchor': 'middle',
      transform: `translate(${lay.x0 - 66} ${lay.rowsY + lay.rowsH / 2}) rotate(-90)`,
      text: 'CUSTOMERS',
    }),
    Deck.svg('text', { class: 'plot-num', x: right + 40, y: bottom + 46, text: 'ms' }));
  for (let n = 10; n <= CUSTOMERS; n += 10) {
    const y = lay.rowsY + (n - 0.5) * lay.pitch;
    svg.append(
      Deck.svg('line', { class: 'plot-tick', x1: lay.x0 - 12, y1: y, x2: lay.x0, y2: y }),
      Deck.svg('text', { class: 'plot-num', x: lay.x0 - 18, y: y + 11, 'text-anchor': 'end', text: n }));
  }
}

function buildAxisLine(svg, lay) {
  const bottom = lay.rowsY + lay.rowsH + 2;
  svg.append(Deck.svg('path', {
    class: 'plot-axis',
    d: `M${lay.x0} ${lay.rowsY} V${bottom} H${lay.x0 + lay.plotW + 8}`,
  }));
}

function buildTicks(svg, lay, scale, axis) {
  const bottom = lay.rowsY + lay.rowsH;
  const group = Deck.svg('g');
  const marks = [];
  for (let ms = 0; ms <= axis.span; ms += axis.minor) {
    const major = ms % axis.major === 0;
    const mark = Deck.svg('g', {}, [
      major && ms > 0 ? Deck.svg('line', { class: 'plot-grid', y1: lay.rowsY, y2: bottom }) : null,
      Deck.svg('line', { class: 'plot-tick', y1: bottom + 2, y2: bottom + (major ? 16 : 10) }),
      major ? Deck.svg('text', { class: 'plot-num', y: bottom + 46, 'text-anchor': 'middle', text: Deck.fmt(ms) }) : null,
    ]);
    group.append(mark);
    marks.push({ ms, mark });
  }
  svg.append(group);
  return opacity => {
    group.style.opacity = opacity;
    for (const { ms, mark } of marks) {
      setShown(mark, opacity > 0 && scale.inside(ms));
      mark.setAttribute('transform', `translate(${scale.at(ms)} 0)`);
    }
  };
}

function buildGhost(svg, lay, scale) {
  const blocks = timeline('wide').rows.filter(row => row.seated).map(row => ({
    row,
    rect: Deck.svg('rect', { class: 'bar is-lock', y: lay.rowsY + row.index * lay.pitch + 1, height: lay.barH }),
  }));
  const endMark = Deck.svg('line', { class: 'plot-mark', y1: lay.rowsY, y2: lay.rowsY + lay.rowsH });
  const group = Deck.svg('g', {}, [...blocks.map(block => block.rect), endMark]);
  svg.append(group);
  return opacity => {
    group.style.opacity = opacity;
    for (const { row, rect } of blocks) scale.stretch(rect, row.lockAt, row.release);
    setShown(endMark, scale.inside(WIDE_MS));
    endMark.setAttribute('x1', scale.at(WIDE_MS));
    endMark.setAttribute('x2', scale.at(WIDE_MS));
  };
}

function buildRows(svg, lay, plan) {
  return plan.rows.map(row => {
    const y = lay.rowsY + row.index * lay.pitch + 1;
    const bar = state => Deck.svg('rect', { class: 'bar ' + state, y, height: lay.barH });
    const parts = {
      wait: bar('is-wait'),
      charge: bar('is-run'),
      lock: bar('is-lock'),
      cap: Deck.svg('rect', {
        class: 'bar ' + (row.seated ? 'is-ok' : 'is-off'), y, width: lay.barH, height: lay.barH,
      }),
    };
    svg.append(parts.wait, parts.charge, parts.lock, parts.cap);
    return parts;
  });
}

function buildLane(svg, lay) {
  const bar = Deck.svg('rect', { class: 'bar is-lock', y: lay.laneY, height: lay.laneH });
  svg.append(
    Deck.svg('rect', { class: 'box', x: lay.x0, y: lay.laneY, width: lay.plotW, height: lay.laneH }),
    bar,
    Deck.svg('text', {
      class: 'lbl sm', x: lay.x0 - 18, y: lay.laneY + lay.laneH, 'text-anchor': 'end', text: 'LOCK',
    }));
  return bar;
}

function buildPen(svg, lay) {
  const arm = Deck.svg('line', { class: 'plot-pen-arm', y1: lay.laneY });
  const tip = Deck.svg('circle', { class: 'plot-pen-tip', r: 9 });
  const group = Deck.svg('g', {}, [
    arm,
    Deck.svg('rect', { class: 'plot-pen-car', x: -17, y: lay.laneY - 8, width: 34, height: 16 }),
    tip,
  ]);
  svg.append(group);
  return (x, y) => {
    group.setAttribute('transform', `translate(${x} 0)`);
    arm.setAttribute('y2', y);
    tip.setAttribute('cy', y);
  };
}

function buildFigure(svg, x, y, anchor, ms, caption, tone) {
  const group = Deck.svg('g', {}, [
    Deck.svg('text', { class: 'val big locks-figure ' + tone, x, y, 'text-anchor': anchor }, [
      Deck.fmt(ms),
      Deck.svg('tspan', { class: 'val unit', dx: 14, text: 'ms' }),
    ]),
    Deck.svg('text', { class: 'val', x, y: y + 56, 'text-anchor': anchor, text: caption }),
  ]);
  svg.append(group);
  return group;
}

function buildFigures(svg, lay, plan) {
  const wideEnd = lay.x0 + (WIDE_MS / FULL.span) * lay.plotW;
  return [
    buildFigure(svg, wideEnd - 28, lay.rowsY + 150, 'end', WIDE_MS, 'wide lock', 'is-ghost'),
    buildFigure(svg, lay.x0 + 90, lay.rowsY + lay.rowsH - 116, 'start', plan.end, 'narrow lock', ''),
  ];
}

function buildParkedPlate(root, lay) {
  const plate = Deck.el('div', {
    class: 'cond',
    style: { left: lay.x0 + 36 + 'px', top: lay.rowsY + Math.round(lay.rowsH * 0.64) + 'px' },
  }, [
    Deck.el('span', { text: 'Parked' }),
    Deck.el('b', { text: CUSTOMERS - 1 + ' threads behind one lock' }),
  ]);
  root.append(plate);
  return [plate];
}

function buildLockNote(root, svg, lay) {
  const y = lay.rowsY + SEATS * lay.pitch + 62;
  const x = lay.x0 + 250;
  const arrow = Deck.svg('path', {
    class: 'locks-pen-mark', 'marker-end': 'url(#arrow-red)',
    d: `M${x - 10} ${y} q-22 -12 -46 -6`,
  });
  const note = Deck.el('div', {
    class: 'note',
    style: { left: x + 'px', top: y - 30 + 'px', '--tilt': '-1.5deg' },
    text: 'the lock is held just to count seats',
  });
  svg.append(arrow);
  root.append(note);
  return [arrow, note];
}

Deck.scene('locks', (root, args, ctx) => {
  const mode = args.mode === 'narrow' ? 'narrow' : 'wide';
  const narrow = mode === 'narrow';
  const plan = timeline(mode);
  const lay = layout(root.clientWidth, root.clientHeight);
  const view = { now: 0, span: FULL.span, zoom: 0, figures: 0, remark: 0 };
  const scale = makeScale(lay, view);

  const svg = Deck.svg('svg', {
    class: 'locks-svg', width: lay.width, height: lay.height, viewBox: `0 0 ${lay.width} ${lay.height}`,
  });
  root.append(svg);

  const seats = buildSeats(svg, lay);
  buildFrame(svg, lay);
  const placeFullTicks = buildTicks(svg, lay, scale, FULL);
  const placeZoomTicks = narrow ? buildTicks(svg, lay, scale, ZOOM) : null;
  const placeGhost = narrow ? buildGhost(svg, lay, scale) : null;
  const rows = buildRows(svg, lay, plan);
  buildAxisLine(svg, lay);
  const laneBar = buildLane(svg, lay);
  const figures = narrow ? buildFigures(svg, lay, plan) : [];
  const placePen = buildPen(svg, lay);
  const readouts = buildReadouts(root, lay);
  buildLegend(root, lay, mode);
  const wideResult = narrow ? buildWideResult(root) : null;
  const remarks = narrow ? buildLockNote(root, svg, lay) : buildParkedPlate(root, lay);

  function drawRow(row, parts) {
    const now = view.now;
    scale.stretch(parts.wait, 0, Math.min(now, row.lockAt));
    scale.stretch(parts.lock, row.lockAt, Math.min(now, row.release), LOCK_MIN_PX);
    scale.stretch(parts.charge, row.release, Math.min(now, row.done));
    const finished = now >= row.done;
    setShown(parts.cap, finished);
    if (finished) {
      parts.cap.setAttribute('x', Math.max(scale.at(row.done), scale.at(row.lockAt) + LOCK_MIN_PX) + 3);
    }
  }

  function drawPen() {
    const holder = plan.rows.findLast(row => row.seated && row.lockAt <= view.now);
    placePen(scale.at(view.now), lay.rowsY + (holder.index + 0.5) * lay.pitch);
  }

  function drawReadouts() {
    const finished = plan.rows.filter(row => view.now >= row.done);
    readouts.clock.set(Deck.fmt(view.now));
    readouts.confirmed.set(String(finished.filter(row => row.seated).length));
    readouts.turnedAway.set(String(finished.filter(row => !row.seated).length));
  }

  function drawAxis() {
    const fullAxis = 1 - Deck.clamp(view.zoom / 0.3, 0, 1);
    placeFullTicks(fullAxis);
    if (!narrow) return;
    const zoomAxis = Deck.clamp((view.zoom - 0.7) / 0.3, 0, 1);
    placeZoomTicks(zoomAxis);
    wideResult.style.opacity = zoomAxis;
    placeGhost(GHOST_OPACITY * fullAxis);
    for (const figure of figures) figure.style.opacity = view.figures * fullAxis;
  }

  function draw() {
    drawAxis();
    plan.rows.forEach((row, i) => drawRow(row, rows[i]));
    scale.stretch(laneBar, 0, Math.min(view.now, plan.lockEnd), LOCK_MIN_PX);
    plan.rows.slice(0, SEATS).forEach((row, i) => seats[i].setAttribute('class', seatClass(row, view.now)));
    drawPen();
    drawReadouts();
    for (const node of remarks) node.style.opacity = view.remark;
  }

  function settle(patch) {
    Object.assign(view, patch);
    draw();
  }

  function run(wallMs, done) {
    ctx.loop((dt, seconds) => {
      const p = Math.min(1, (seconds * 1000) / wallMs);
      settle({ now: p * plan.end });
      if (p < 1) return true;
      if (done) done();
      return false;
    });
  }

  function fadeIn(key) {
    ctx.tween(FADE_MS, p => settle({ [key]: p }));
  }

  function playWide(animate) {
    if (!animate) return settle({ now: plan.end, remark: 0 });
    settle({ now: 0, remark: 0 });
    ctx.after(LEAD_MS, () => run(plan.end));
  }

  function showParked(animate) {
    settle({ now: plan.end, remark: animate ? 0 : 1 });
    if (animate) fadeIn('remark');
  }

  function playNarrow(animate) {
    const fullAxis = { span: FULL.span, zoom: 0, remark: 0 };
    if (!animate) return settle({ ...fullAxis, now: plan.end, figures: 1 });
    settle({ ...fullAxis, now: 0, figures: 0 });
    ctx.after(LEAD_MS, () => run(plan.end, () => fadeIn('figures')));
  }

  function setZoom(p) {
    settle({ zoom: p, span: FULL.span * Math.pow(ZOOM.span / FULL.span, p) });
  }

  function replaySlowly() {
    settle({ now: 0 });
    run(SLOW_REPLAY_MS, () => fadeIn('remark'));
  }

  function zoomIn(animate) {
    settle({ now: plan.end, figures: 1, remark: animate ? 0 : 1 });
    if (!animate) return setZoom(1);
    setZoom(0);
    ctx.tween(ZOOM_MS, setZoom, {
      ease: Deck.ease.inOut,
      done: () => ctx.after(PAUSE_MS, replaySlowly),
    });
  }

  const steps = narrow ? [playNarrow, zoomIn] : [playWide, showParked];

  return {
    setStep(step, animate) {
      ctx.cancel();
      steps[Deck.clamp(step, 0, steps.length - 1)](animate);
    },
  };
});
