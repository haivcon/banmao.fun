import { secondaryMotionSvg } from '../app/collection/banmaoking/secondary-motion';
import { previewSvg } from '../app/collection/banmaoking/smil-preview';
import rig from '../app/collection/banmaoking/neutral-rig.json';
import profiles from '../app/collection/banmaoking/choreography.json';
import { choreographySvg } from '../app/collection/banmaoking/choreography';

test('all actions own distinct tail shapes and preserve their intended signatures', () => {
  const tails = profiles.map((p, id) => {
    expect(choreographySvg(id)).toContain(`values="${p.tail.split(';').map(v => `${v} 318 383`).join(';')}"`);
    return secondaryMotionSvg(id).match(/href="#king-tail-flex-silhouette"[^>]*values="([^"]+)"/)![1];
  });
  expect(new Set(tails).size).toBe(21);
  expect(Math.min(...profiles[1].lift.split(';').map(Number))).toBeLessThan(-20);
  expect(profiles[10].lift.split(';').map(Number).filter(v => v < -5)).toHaveLength(2);
  expect(profiles[17].left.split(';').map(Number).every(v => v <= 0)).toBe(true);
  for (const id of [4, 7, 15]) expect(Math.max(...profiles[id].tail.split(';').map(Number))).toBeGreaterThan(12);
  for (const id of [0,2,5,8,12,13,15,16,17]) expect(secondaryMotionSvg(id)).toContain('href="#king-step-left"');
});

test.each(Array.from({length:21},(_,i)=>i))('secondary motion %i uses closed loops and existing unique targets', expression => {
  const motion = secondaryMotionSvg(expression);
  // Use a staff so the action-8 accessory-specific counter-rotation has a target.
  const svg = previewSvg({body: 13,expression,accessory:14,background:16},1,'secondary');
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  for(const match of motion.matchAll(/href="#([^"]+)"/g)) expect(ids).toContain('secondary-'+match[1]);
  for(const match of motion.matchAll(/values="([^"]+)"/g)) {
    const beats=match[1].split(';');
    expect(beats).toHaveLength(7);
    if (match[1].includes('360 256 256')) {
      expect(beats[0]).toBe('0 256 256');
      expect(beats[6]).toBe('360 256 256'); // identical final matrix, full revolution
    } else if (match[1].includes('-360 369 345')) {
      expect(beats[0]).toBe('0 369 345');
      expect(beats[6]).toBe('-360 369 345'); // staff counter-rotation also closes
    } else expect(beats[0]).toBe(beats[6]);
  }
  expect(motion).not.toContain('king-paw-cupped');
  expect(svg).not.toContain('undefined');
});
test.each(Array.from({length:21},(_,i)=>i))('full-turn targets match accessory %i', accessory => {
  const svg = previewSvg({body: 13,expression:8,accessory,background:16},1,'turn');
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain('turn-king-full-turn');
  // The remaining staff entry and Imperial Regalia own a counter-turn group. A shared
  // SMIL href without that optional accessory target is deliberately inert.
  const target = 'turn-smil-king-staff-counter-turn';
  expect(ids.filter(id => id === target)).toHaveLength([14,20].includes(accessory) ? 1 : 0);
  for (const match of secondaryMotionSvg(8).matchAll(/href="#([^"]+)"/g)) {
    if (match[1] !== 'smil-king-staff-counter-turn') expect(ids).toContain('turn-'+match[1]);
  }
});

test('tail uses absolute geometry for coherent stripes and highlights',()=>{
  for(const kind of ['silhouette','stripes','highlight']) {
    const tag=rig.rear.match(new RegExp(`<path[^>]*data-tail-flex="${kind}"[^>]*>`))![0];
    const d=tag.match(/\sd="([^"]+)"/)![1];
    expect(d).not.toMatch(/[a-z]/);
  }
});
test.each([3,11,17])('expression %i curls the tail without changing path topology or root', id => {
  const motion = secondaryMotionSvg(id);
  for (const kind of ['silhouette','stripes','highlight']) {
    const frames = motion.match(new RegExp(`href="#king-tail-flex-${kind}"[^>]*values="([^"]+)"`))![1].split(';');
    const commands = (d: string) => d.replace(/[^A-Z]/g, '');
    for (const frame of frames) {
      expect(commands(frame)).toBe(commands(frames[0]));
      expect(frame).not.toMatch(/NaN|undefined/);
    }
    if (kind === 'silhouette') {
      expect(frames[3]).toContain('450 324 408 318');
      expect(frames[3]).toMatch(/^M316 371/);
      expect(frames[3]).toMatch(/316 358Z$/);
    }
  }
});

// Sample the actual cubic outline rather than just checking authored strings.
function tailPolygon(d: string): number[][] {
  const n=d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const points=[n.slice(0,2)];
  for(let i=2;i<n.length;i+=6) {
    const [x,y]=points[points.length-1];
    for(let step=1;step<=32;step++) {
      const t=step/32,u=1-t;
      points.push([u*u*u*x+3*u*u*t*n[i]+3*u*t*t*n[i+2]+t*t*t*n[i+4],u*u*u*y+3*u*u*t*n[i+1]+3*u*t*t*n[i+3]+t*t*t*n[i+5]]);
    }
  }
  return points;
}
const polygonArea=(p:number[][])=>Math.abs(p.reduce((sum,a,i)=>{
  const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];
},0))/2;

test.each([3,11,17])('curl %i keeps a slender outline and an open coil',id=>{
  const frames=secondaryMotionSvg(id).match(/href="#king-tail-flex-silhouette"[^>]*values="([^"]+)"/)![1].split(';');
  const neutralArea=polygonArea(tailPolygon(frames[0]));
  for(let i=0;i<frames.length-1;i++) {
    const a=frames[i].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const b=frames[i+1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    for(let step=0;step<=10;step++) {
      let index=0;
      const d=frames[i].replace(/-?\d+(?:\.\d+)?/g,()=>{
        const j=index++;return String(a[j]+(b[j]-a[j])*step/10);
      });
      expect(polygonArea(tailPolygon(d))).toBeLessThan(neutralArea*1.3);
    }
  }
  const p=tailPolygon(frames[3]);
  // The centre of the coil must be background, not a filled balloon.
  const [x,y]=[404,365];let inside=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++) {
    const a=p[i],b=p[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  expect(inside).toBe(false);
});

test('Zen stays planted; shuffle alternates separate step nodes',()=>{
  expect(secondaryMotionSvg(11)).not.toContain('href="#king-step-');
  expect(secondaryMotionSvg(8)).toContain('href="#king-step-left"');
  expect(secondaryMotionSvg(8)).toContain('href="#king-step-right"');
  expect(()=>secondaryMotionSvg(21)).toThrow(RangeError);
});
