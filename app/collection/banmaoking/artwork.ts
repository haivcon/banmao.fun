import { cyborgFinish } from './cyborg';
import profiles from './choreography.json';
import { BODY_TRAITS } from './traits';
import { bodyEffects, cyborgBody } from './body-effects';
import { actionPoseSvg } from "./anatomy";
import { refinedCore, expansionFace, whiskersSvg } from './expression-design';
export { actionPoseSvg, frontPawsSvg } from "./anatomy";

function peelHighlight(peel: string) {
  switch (peel) {
    case "#fff36b": return "#fffac5";
    case "#b9e44a": return "#edf9be";
    case "#ffad6b": return "#ffe3c4";
    case "#72d8e8": return "#d8faff";
    case "#a985e8": return "#eee3ff";
    case "#ff8fc6": return "#ffe0f0";
    case "#d8d8d8": return "#ffffff";
    case "#49318c": return "#b5a0d8";
    case "#f7931a": return "#ffe2a0";
    case "#8198ef": return "#d8e3ff";
    case "#eeeeee": return "#ffffff";
    case "#203b3a": return "#355652";
    case "#343d4c": return "#505d70";
    case "#ffb7ce": return "#ffe5ef";
    case "#ca4262": return "#f0a0b8";
    case "#b4efff": return "#f0ffff";
    default: return "#fff9a8";
  }
}
export function expressionSvg(id: number) {
  if (!Number.isInteger(id) || id < 0 || id > 20) throw new RangeError('Invalid expression');
  if (id >= 12) return expansionFace(id);
  const defaultEyes = `<ellipse cx="218" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="294" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="211" cy="206" rx="7" ry="9" fill="white"/><ellipse cx="287" cy="206" rx="7" ry="9" fill="white"/>`;
  const happyEyes = `<ellipse cx="224" cy="211" rx="20" ry="24" fill="#211d19" stroke="#80643a" stroke-width="2.5"/><ellipse cx="288" cy="211" rx="20" ry="24" fill="#211d19" stroke="#80643a" stroke-width="2.5"/><ellipse cx="217" cy="202" rx="6.5" ry="8.5" fill="white"/><ellipse cx="281" cy="202" rx="6.5" ry="8.5" fill="white"/><circle cx="230" cy="218" r="3" fill="white" opacity=".78"/><circle cx="294" cy="218" r="3" fill="white" opacity=".78"/>`;
  const brow =
    id === 6
      ? `<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>`
      : "";
  const tears =
    id === 7
      ? `<g class="king-tears"><path d="M207 237q-8 18 4 22 12-6 3-22M305 237q8 18-4 22-12-6-3-22" fill="#71d9ff" stroke="#3c9dc9" stroke-width="1.5"/><path d="M209 243l-1 7M303 243l1 7" stroke="#e0faff" stroke-width="2" stroke-linecap="round"/></g>`
      : "";
  const eyes =
    id === 11 ? `<path d="M199 216q21 9 42 0M271 216q21 9 42 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/><path d="M205 190q15-5 30 0M277 190q15-5 30 0" fill="none" stroke="#a56a42" stroke-width="2" stroke-linecap="round"/>` :
    id === 5 ? `<ellipse cx="218" cy="213" rx="23" ry="28" fill="#fff8df" stroke="#784727" stroke-width="3"/><ellipse cx="294" cy="213" rx="23" ry="28" fill="#fff8df" stroke="#784727" stroke-width="3"/><ellipse cx="218" cy="215" rx="12" ry="18" fill="#211d19"/><ellipse cx="294" cy="215" rx="12" ry="18" fill="#211d19"/><path d="M200 179q18-9 34 0M278 179q18-9 34 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/><circle cx="214" cy="209" r="4" fill="white"/><circle cx="290" cy="209" r="4" fill="white"/>` :
    id === 9 ? `<path d="M198 210q20-12 40 0v8q-20 23-40 0zM274 210q20-12 40 0v8q-20 23-40 0z" fill="#292825" stroke="#784727" stroke-width="3"/><path d="M199 210h38M275 210h38" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><path d="M207 217h9M283 217h9" stroke="#cce8ff" stroke-width="3" stroke-linecap="round"/>` :
    id === 0
      ? happyEyes
      : id === 2
        ? `<path d="M199 219q21-16 41 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><ellipse cx="292" cy="216" rx="19" ry="23" fill="#292825" stroke="#784727" stroke-width="2.5"/><ellipse cx="286" cy="208" rx="6" ry="8" fill="white"/><circle cx="298" cy="225" r="3" fill="white" opacity=".8"/>`
        : id === 3
          ? `<path d="M220 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22zM292 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22z" fill="#f05272" stroke="#784727" stroke-width="3"/><path d="M205 205q4-6 9 0M277 205q4-6 9 0" fill="none" stroke="#ffb6c7" stroke-width="4" stroke-linecap="round"/>`
          : id === 4 || id === 11
            ? `<path d="M199 218q21 16 42 0M271 218q21 16 42 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>`
            : id === 10
              ? `<path d="M220 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2zM292 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2z" fill="#ffd84e" stroke="#6b5320" stroke-width="3"/><path d="M215 210l5-8 4 9M287 210l5-8 4 9" fill="none" stroke="#fff8ce" stroke-width="3" stroke-linecap="round"/>`
              : `${defaultEyes}`;
  const mouth =
    id === 7 ? `<path d="M241 274q15-11 30 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>` :
    id === 11 ? `<path d="M246 268q10 3 20 0" fill="none" stroke="#633c25" stroke-width="2.5" stroke-linecap="round"/>` :
    id === 9 ? `<path d="M240 268q14 5 29-4" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>` :
    id === 0
      ? `<path d="M241 255q15 13 30 0" fill="none" stroke="#6f4930" stroke-width="2.8" stroke-linecap="round"/>`
      : id === 1
        ? `<path d="M256 255v5" fill="none" stroke="#784727" stroke-width="2.2" stroke-linecap="round"/><path d="M241 259Q256 265 271 259C269 280 243 280 241 259Z" fill="#663b3b" stroke="#784727" stroke-width="2" stroke-linejoin="round"/><path d="M248 271Q256 266 264 271Q256 277 248 271Z" fill="#f58b91" stroke="#ba626c" stroke-width="1"/>`
        : id === 4 || id === 11
          ? `<path d="M243 271q13 7 26 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>`
          : id === 5
            ? `<ellipse cx="256" cy="271" rx="10" ry="13" fill="#482b32" stroke="#784727" stroke-width="2"/><ellipse cx="256" cy="278" rx="5" ry="3" fill="#f58b91" stroke="#ba626c" stroke-width="1"/>`
            : id === 6
              ? `<path d="M239 278q17-16 34 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>`
              : id === 8
                ? `<path d="M237 261q19 18 38 0" fill="#663b3b"/><path d="M249 274q8 16 15 0" fill="#f58b91" stroke="#633c25" stroke-width="2"/>`
                : `<path d="M256 257v7q-9 12-23 2M256 264q9 12 23 2" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const blush =
    id === 0 || id === 1 || id === 3
      ? `<ellipse cx="190" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/><ellipse cx="322" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/>`
      : "";
  const nose = `<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>`;
  return refinedCore(`<g id="expression">${eyes}${brow}${tears}${nose}<g class="king-mouth">${mouth}</g>${whiskersSvg()}${blush}</g>`, id);
}

export const ACTION_NAMES = profiles.map(profile => profile.name);
export const ACTION_POSE_COUNT = ACTION_NAMES.length;
export function actionIndex(expression: number) {
  if (!Number.isInteger(expression) || expression < 0 || expression >= ACTION_POSE_COUNT) throw new RangeError('Invalid expression');
  return expression;
}
export function actionTransform(_expression: number) { return 'translate(0 0)'; }
export function actionShadowSvg(_expression: number) {
  return '<ellipse id="action-shadow" cx="256" cy="477" rx="101" ry="13" fill="#625b52" opacity=".18"/>';
}

import bodyTips from './body-tips-contract.json';
import bodyShells from './body-shell-contract.json';

export function bodySvg(peel: string, shade: string, tokenId = 0) {
  const id = BODY_TRAITS.findIndex(body => body.color === peel);
  // Cyborg retains a natural half; its shell reflections use the cool suit palette.
  const raw = baseBodySvg(id === 4 ? '#ffe53b' : peel, id === 4 ? '#d9ad14' : shade, tokenId);
  const base = id >= 0 ? raw.replace(/<g id="banana-shell">[\s\S]*?<\/g>/, bodyShells[id]) : raw;
  // Replace the legacy tip with exact contract-emitted artwork (badge bodies emit empty).
  const costume = id >= 0 ? base.replace(/<path d="M258 462[^>]*\/>|<path d="M264 468[^>]*\/>/g, '')
    .replace(/<\/g><\/g>$/, (bodyTips[id] ?? '') + '</g></g>') : base;
  const styled = id === 4 ? cyborgBody(costume) : costume;
  const finished = styled.replace(/<\/g>$/, (id >= 0 ? bodyEffects(id) : '') + '</g>');
  return id === 4 ? cyborgFinish(finished, tokenId) : finished;
}

export function baseBodySvg(peel: string, shade: string, tokenId = 0) {
  return `<g id="body"><defs><linearGradient id="bk-peel" x1=".12" y1=".08" x2=".9" y2=".82"><stop stop-color="${peelHighlight(peel)}"/><stop offset=".28" stop-color="${peel}"/><stop offset=".72" stop-color="${peel}"/><stop offset="1" stop-color="${shade}"/></linearGradient><linearGradient id="bk-fur" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#ffc77e"/><stop offset=".58" stop-color="#e99a50"/><stop offset="1" stop-color="#c87538"/></linearGradient><radialGradient id="bk-muzzle"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f3d5b4"/></radialGradient><radialGradient id="bk-opening" cx="50%" cy="44%" r="62%"><stop offset=".72" stop-color="#744823"/><stop offset=".9" stop-color="#5b351c"/><stop offset="1" stop-color="#3f2516"/></radialGradient></defs>${actionPoseSvg(tokenId)}
<g id="cat-behind" display="none"><g transform="translate(318 405) scale(1.07) translate(-318 -382)"><path d="M318 382c29-2 39 25 61 30 22 5 41-8 42-27 1-15-11-24-22-18-8 4-9 15-2 20 5 4 12 1 14-4 2 10-6 18-16 19-22 3-38-27-77-25z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M342 387q9 15 20 20M362 402q9 10 19 12M385 405q9 5 18 3" fill="none" stroke="#9f572f" stroke-width="5" stroke-linecap="round"/></g><path d="M178 418l-2 39c-16 6-24 19-19 29 6 13 39 14 52 3 9-7 6-21-7-29l2-42zM308 418l2 42c-13 8-16 22-7 29 13 11 46 10 52-3 5-10-3-23-19-29l-2-39z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M162 477q22-9 45 0M305 477q23-9 45 0M176 462q-3 10 0 19M196 461q-2 10 1 19M315 461q-3 10-1 19M336 462q3 10 0 19" fill="none" stroke="#b66c38" stroke-width="3" stroke-linecap="round"/><path d="M171 301c-27 7-48 29-49 53-1 20 13 34 30 28 20-7 30-42 33-74zM341 301c27 7 48 29 49 53 1 20-13 34-30 28-20-7-30-42-33-74z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M143 330q16 3 32 12M139 347q15 4 30 13M370 331q-16 3-32 12M374 348q-15 4-30 13" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/><path d="M139 361q8 10 18 7M373 362q-8 10-18 7" fill="none" stroke="#ffe1b2" stroke-width="4" stroke-linecap="round"/></g><g id="banana-shell"><path d="M239 76c-9-18-10-38-5-56 10-7 24-9 34-4 4 18 2 40-4 58 44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-22 10-51 11-76 4-34-8-60-27-70-58-21-58-21-143-6-216 12-58 38-102 82-126z" fill="url(#bk-peel)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M264 74c44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-10 4-20 6-31 7 26-39 39-97 36-176-3-90-16-165-45-223z" fill="${shade}" opacity=".2"/><path d="M234 20c10-7 24-9 34-4l1 15c-10 8-25 10-36 5z" fill="#79512f" stroke="#65503a" stroke-width="2.4"/><path d="M239 22q12-5 25-3" fill="none" stroke="#c39b71" stroke-width="1.8" stroke-linecap="round"/><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="url(#bk-opening)" stroke="#80643a" stroke-width="2.4"/><path d="M181 122c-20 71-24 157-10 226 12 59 45 101 96 118" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity=".16"/><path d="M242 104c-14 91-12 181-2 253 8 57 18 91 30 108" fill="none" stroke="#fff8a6" stroke-width="1.8" stroke-linecap="round" opacity=".5"/><path d="M322 115c25 71 31 155 21 226-9 62-33 104-70 124" fill="none" stroke="${shade}" stroke-width="2.2" stroke-linecap="round" opacity=".48"/></g>

<g id="face-rim"><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="none" stroke="#62462b" stroke-width="3.5" opacity=".58"/><path class="king-rim-light" d="M170 238c12 32 42 50 86 52 43-2 74-20 86-52" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".38"/></g>
<g id="cat"><path d="M171 198c9-39 40-63 85-64 45 1 76 25 85 64 8 51-23 86-85 89-62-3-93-38-85-89z" fill="url(#bk-fur)"/><g class="king-ear king-ear-left"><g class="king-ear-shape" transform="translate(205 153) scale(.85 .82) translate(-205 -153)"><path d="M180 160Q180 123 193 94Q218 112 230 151Z" fill="url(#bk-fur)" stroke="#87502d" stroke-width="3" stroke-linejoin="round"/><path d="M189 145L195 109L219 145Z" fill="#f4b16c"/><path d="M195 119l8 23" stroke="#ffd5a0" stroke-width="3" stroke-linecap="round"/></g></g><g class="king-ear king-ear-right"><g class="king-ear-shape" transform="translate(307 153) scale(.85 .82) translate(-307 -153)"><path d="M332 160Q332 123 319 94Q294 112 282 151Z" fill="url(#bk-fur)" stroke="#87502d" stroke-width="3" stroke-linejoin="round"/><path d="M323 145L317 109L293 145Z" fill="#f4b16c"/><path d="M317 119l-8 23" stroke="#ffd5a0" stroke-width="3" stroke-linecap="round"/></g></g><path d="M216 143q13 17 16 42M256 135v48M296 143q-13 17-16 42" fill="none" stroke="#a95d31" stroke-width="6" stroke-linecap="round"/><path d="M179 230q19 9 37 5M333 230q-19 9-37 5" fill="none" stroke="#c3733d" stroke-width="4" stroke-linecap="round"/><ellipse cx="236" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/><ellipse cx="276" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/></g>
<g id="costume-details"><path d="M258 462c7 5 19 7 28 1-2 8-7 15-15 17-7-2-12-9-13-18z" fill="#79512f"/><path d="M258 462c1 9 6 16 13 18 8-2 13-9 15-17" fill="none" stroke="#65503a" stroke-width="1.8" stroke-linecap="round"/><path d="M264 468q7 4 15 1" fill="none" stroke="#c39b71" stroke-width="1.5" stroke-linecap="round"/></g></g>`;
}
