const { spawn } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const WebSocket = require('ws');
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--remote-debugging-port=9337', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'king-audit-'))}`], { stdio: 'ignore' });
  let socket;
  try {
    let tabs;
    for (let i = 0; i < 40; i++) { try { tabs = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await delay(250); } }
    socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => socket.once('open', r));
    let id = 0;
    const pending = new Map();
    socket.on('message', data => { const m = JSON.parse(data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, m => m.error ? reject(m.error) : resolve(m.result)); socket.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:3000/collection/banmaoking' });
    for (let i = 0; i < 90; i++) { if (await evaluate('!!document.querySelector(".king-character-motion")')) break; await delay(1000); }
    const inspect = `JSON.stringify({title:document.title, reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, toggle:document.querySelector('.king-motion-toggle')?.textContent, svg:document.querySelector('.king-art')?.outerHTML.slice(0,300), motion:[...document.querySelectorAll('.king-character-motion,.king-ground-motion')].map(e=>({animation:getComputedStyle(e).animation,transform:getComputedStyle(e).transform,count:e.getAnimations().length})), sheets:[...document.styleSheets].map(s=>s.href)})`;
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await delay(300);
    const badgeCheck = await evaluate(`(() => {
      const cells = [...document.querySelectorAll('.king-token-cells > rect')];
      if (cells.length !== 75) return false;
      const animations = cells.map(c => c.getAnimations()[0]);
      if (animations.some(a => !a)) return false;
      const seek = phase => animations.forEach(a => { a.pause(); a.currentTime = Number(a.effect.getTiming().duration) * phase; });
      const positions = () => cells.map(c => { const b = c.getBoundingClientRect(); return [b.x, b.y].map(v => v.toFixed(2)).join(','); });
      seek(0);
      const visibleTiles = cells.filter(c => Number(getComputedStyle(c).opacity) === 1);
      const fiveSquares = visibleTiles.length === 45 && new Set(positions()).size === 45 && cells.every(c => getComputedStyle(c).width === '9px' && getComputedStyle(c).height === '9px');
      seek(.3);
      const scattered = new Set(positions()).size > 5;
      seek(.5);
      const assembled = cells.every(c => getComputedStyle(c).transform === 'matrix(1, 0, 0, 1, 0, 0)' && Number(getComputedStyle(c).opacity) === Number(c.style.getPropertyValue('--lit')));
      const art = document.querySelector('.king-art').getBoundingClientRect();
      const bounds = cells.map(c => c.getBoundingClientRect());
      const topRight = bounds.every(b => b.left >= art.left && b.right < art.left + art.width * .25 && b.top >= art.top && b.bottom < art.top + art.height * .15);
      animations.forEach(a => { a.currentTime = 0; a.play(); });
      return fiveSquares && scattered && assembled && topRight;
    })()`);
    if (!badgeCheck) throw Error('Pixel badge did not assemble in Chrome');
    console.log('PASS pixel badge X-to-ID keyframes');
    console.log('INITIAL', await evaluate(inspect));
    await delay(900); console.log('LATER', await evaluate(inspect));
    await evaluate('document.querySelector(".king-random").click()');
    await delay(600); console.log('RANDOM', await evaluate(inspect));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await delay(600); console.log('NO_PREFERENCE', await evaluate(inspect));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await delay(300); console.log('REDUCE', await evaluate(inspect));
    const running = () => evaluate(`document.querySelector('.king-character-motion').getAnimations().length > 0`);
    const assert = (ok, message) => { if (!ok) throw new Error(message); console.log('PASS', message); };
    assert(!(await running()), 'system reduced motion defaults to stopped');
    assert(await evaluate(`document.querySelector('.king-motion-toggle').getAttribute('aria-pressed') === 'false'`), 'toggle reports actual stopped state');
    await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    await delay(350);
    assert(await running(), 'explicit opt-in runs under reduced motion');
    const before = await evaluate(`getComputedStyle(document.querySelector('.king-character-motion')).transform`);
    await delay(400);
    assert(before !== await evaluate(`getComputedStyle(document.querySelector('.king-character-motion')).transform`), 'transform changes over real time');
    for (let i = 0; i < 6; i++) {
      await evaluate(`document.querySelector('.king-random').click()`);
      await delay(150);
      assert(await running(), `randomize pose ${i} preserves playback`);
    }
    await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    await delay(150);
    assert(!(await running()), 'explicit off stops playback');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await delay(150);
    assert(!(await running()), 'explicit off survives system preference change');
    await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    await delay(150);
    assert(await running(), 'explicit on works without reduced motion');
    for (const part of ['.king-tail', '.king-whiskers-left', '.king-leg-left']) {
      assert(await evaluate(`document.querySelector('${part}').getAnimations().length > 0`), `${part} has independent motion`);
      const changed = await evaluate(`(() => {
        const el = document.querySelector('${part}');
        const animation = el.getAnimations()[0];
        animation.pause();
        const duration = Number(animation.effect.getTiming().duration);
        animation.currentTime = 0;
        const before = getComputedStyle(el).transform;
        // Some moods deliberately hold still at 74%; sample the whole cycle.
        const samples = [.1, .25, .4, .5, .65, .8, .9].map(phase => {
          animation.currentTime = duration * phase;
          return getComputedStyle(el).transform;
        });
        animation.play();
        return samples.some(after => before !== after);
      })()`);
      assert(changed, `${part} changes across its keyframes`);
    }
    assert(await evaluate(`document.querySelectorAll('.king-ear-shape').length === 2`), 'both compact ear shapes rendered');
    await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    assert(await evaluate(`[...document.querySelectorAll('.king-art *')].every(e => e.getAnimations().length === 0)`), 'off stops all secondary motion');
    await evaluate(`document.querySelector('[title="Headphones"]').click()`);
    await delay(200);
    for (const enabled of [false, true]) {
      if (enabled) {
        await evaluate(`document.querySelector('.king-motion-toggle').click()`);
        await delay(250);
      }
      const cups = await evaluate(`(() => {
        const accessory = document.querySelector('#accessory');
        return [...accessory.querySelectorAll('g > rect')].map(rect => {
          const box = rect.getBBox();
          const matrix = accessory.getScreenCTM().inverse().multiply(rect.getScreenCTM());
          const center = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(matrix);
          return { x: center.x, y: center.y };
        });
      })()`);
      assert(cups?.length === 2, 'headphones contain two cups');
      assert(Math.abs(cups[0].x - 182) < .1 && Math.abs(cups[0].y - 155) < .1,
        `left headphone cup stays on SVG pivot (motion=${enabled})`);
      assert(Math.abs(cups[1].x - 330) < .1 && Math.abs(cups[1].y - 155) < .1,
        `right headphone cup stays on SVG pivot (motion=${enabled})`);
    }
    await evaluate(`document.querySelector('.king-motion-toggle').click(); document.querySelector('.king-art').scrollIntoView({block:'center'})`);
    await delay(200);
    const clip = await evaluate(`(() => { const r = document.querySelector('.king-art').getBoundingClientRect(); return {x:r.x + scrollX,y:r.y + scrollY,width:r.width,height:r.height,scale:1}; })()`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
    require('node:fs').writeFileSync(join(tmpdir(), 'king-headphones-check.png'), Buffer.from(screenshot.data, 'base64'));
    console.log('Headphones screenshot:', join(tmpdir(), 'king-headphones-check.png'));
    for (const name of ['King Crown', 'Red Bow', 'Round Glasses', 'Pixel Shades']) {
      await evaluate(`document.querySelector('[title="${name}"]').click()`);
      await delay(200);
      const shot = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
      require('node:fs').writeFileSync(join(tmpdir(), `king-${name.replaceAll(' ', '-').toLowerCase()}-check.png`), Buffer.from(shot.data, 'base64'));
      await evaluate(`document.querySelector('.king-motion-toggle').click()`);
      await delay(200);
      assert(await evaluate(`document.querySelector('#accessory').getAnimations().length === 0`), `${name} attachment remains anchored`);
      const detail = '.king-art ' + (name === 'Red Bow' ? '.king-bow-tails' : name === 'Round Glasses' ? '.king-glasses-glint' : name === 'Pixel Shades' ? '.king-pixel' : '#accessory .king-jewel');
      if (name === 'Round Glasses' || name === 'Pixel Shades') {
        const expected = name === 'Round Glasses' ? 'kingLensSweep' : 'kingPixelPulse';
        const actual = await evaluate(`getComputedStyle(document.querySelector('${detail}')).animationName`);
        console.log('LENS ANIMATION', name, actual);
        assert(actual.includes(expected), `${name} uses dedicated lens motion`);
        assert(await evaluate(`(() => {
          const el = document.querySelector('${detail}');
          const animation = el.getAnimations()[0];
          animation.pause(); animation.currentTime = 0;
          const before = getComputedStyle(el).transform;
          animation.currentTime = Number(animation.effect.getTiming().duration) / 2;
          const changed = before !== getComputedStyle(el).transform;
          animation.play(); return changed;
        })()`), `${name} lens details move across keyframes`);
      }
      assert(await evaluate(`document.querySelector('${detail}').getAnimations().length > 0`), `${name} detail animates`);
      await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    }
    for (const name of ['Round Glasses', 'Pixel Shades', 'Party Hat', 'Gold Chain', 'Leaf Pin', 'Headphones', 'Wizard Hat', 'Halo', 'Tiny Cape']) {
      await evaluate(`document.querySelector('[title="${name}"]').click()`);
      await delay(120);
      assert(await evaluate(`document.querySelector('.king-art .king-detail').getAnimations().length === 0`), `${name} accent stops with motion off`);
      await evaluate(`document.querySelector('.king-motion-toggle').click()`);
      await delay(120);
      assert(await evaluate(`(() => {
        const el = document.querySelector('.king-art .king-detail');
        const animation = el.getAnimations()[0];
        if (!animation) return false;
        animation.pause(); animation.currentTime = 0;
        const before = getComputedStyle(el).transform;
        animation.currentTime = Number(animation.effect.getTiming().duration) / 2;
        const changed = before !== getComputedStyle(el).transform;
        animation.play(); return changed;
      })()`), `${name} accent moves across keyframes`);
      await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    }
    for (const [name, fixed, moving] of [
      ['Wizard Hat', '.king-wizard-brim', '.king-wizard-tip'],
      ['Halo', null, '.king-halo-sweep'],
      ['Tiny Cape', '.king-cape-clasp', '.king-cape-wing'],
    ]) {
      await evaluate(`document.querySelector('[title="${name}"]').click(); document.querySelector('.king-motion-toggle').click()`);
      await delay(150);
      if (fixed) assert(await evaluate(`document.querySelector('.king-art ${fixed}').getAnimations().length === 0 && document.querySelector('.king-art #accessory').getAnimations().length === 0`), `${name} attachment is stationary`);
      assert(await evaluate(`document.querySelector('.king-art ${moving}').getAnimations().length > 0`), `${name} new motion is active`);
      if (name === 'Wizard Hat') {
        assert(await evaluate(`(() => {
          const root = document.querySelector('.king-art');
          const rear = root.querySelector('#accessory-rear');
          const body = root.querySelector('#cat');
          const front = root.querySelector('#accessory');
          return !!rear && !!body && !!front &&
            !!(rear.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING) &&
            !!(body.compareDocumentPosition(front) & Node.DOCUMENT_POSITION_FOLLOWING) &&
            root.querySelectorAll('.king-wizard-brim').length === 2 &&
            [...root.querySelectorAll('.king-wizard-brim')].every(el => el.getAnimations().length === 0);
        })()`), 'wizard rear/body/front paint order and both stationary brim halves');
      }
      if (name === 'Halo') {
        assert(await evaluate(`(() => {
          const root = document.querySelector('.king-art');
          const rear = root.querySelector('#accessory-rear');
          const front = root.querySelector('#accessory');
          const body = root.querySelector('#cat');
          if (!rear?.querySelector('.king-halo-back') || front.querySelector('.king-halo-back')) return false;
          if (!(rear.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING) ||
              !(body.compareDocumentPosition(front) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
          const animations = [rear, front].map(el => el.getAnimations().find(a => a.animationName === 'kingHalo'));
          if (animations.some(a => !a)) return false;
          animations.forEach(a => { a.pause(); a.currentTime = 2400; });
          const aligned = getComputedStyle(rear).transform === getComputedStyle(front).transform;
          animations.forEach(a => a.play());
          return aligned;
        })()`), 'halo rear/body/front order and synchronized motion');
      }
      const shot = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
      require('node:fs').writeFileSync(join(tmpdir(), `king-${name.replaceAll(' ', '-').toLowerCase()}-redesign.png`), Buffer.from(shot.data, 'base64'));
      await evaluate(`document.querySelector('.king-motion-toggle').click()`);
    }
    await send('Browser.close');
  } finally { socket?.close(); browser.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
