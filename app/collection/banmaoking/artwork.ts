export function expressionSvg(id: number) {
  const defaultEyes = `<ellipse cx="218" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="294" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="211" cy="206" rx="7" ry="9" fill="white"/><ellipse cx="287" cy="206" rx="7" ry="9" fill="white"/>`;
  const happyEyes = `<ellipse cx="224" cy="211" rx="18.8" ry="22.56" fill="#211d19" stroke="#80643a" stroke-width="2.35"/><ellipse cx="288" cy="211" rx="18.8" ry="22.56" fill="#211d19" stroke="#80643a" stroke-width="2.35"/><ellipse cx="217.42" cy="202.54" rx="6.11" ry="7.99" fill="white" opacity="0.9"/><ellipse cx="281.42" cy="202.54" rx="6.11" ry="7.99" fill="white" opacity="0.9"/><circle cx="229.64" cy="217.58" r="2.82" fill="white" opacity="0.7"/><circle cx="293.64" cy="217.58" r="2.82" fill="white" opacity="0.7"/>`;
  const brow = id === 6 ? `<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>` : "";
  const tears = id === 7 ? `<path d="M207 237q-8 18 4 22 12-6 3-22M305 237q8 18-4 22-12-6-3-22" fill="#71d9ff"/>` : "";
  const eyes = id === 0
    ? happyEyes
    : id === 2
    ? `<path d="M199 219q21-16 41 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><ellipse cx="292" cy="216" rx="19" ry="23" fill="#292825"/><ellipse cx="286" cy="208" rx="6" ry="8" fill="white"/><circle cx="298" cy="225" r="3" fill="white" opacity=".8"/>`
    : id === 3
      ? `<path d="M220 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22zM292 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22z" fill="#f05272" stroke="#784727" stroke-width="3"/>`
      : id === 4 || id === 11
        ? `<path d="M199 218q21 16 42 0M271 218q21 16 42 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>`
        : id === 10
          ? `<path d="M220 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2zM292 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2z" fill="#ffd84e" stroke="#6b5320" stroke-width="3"/>`
          : `${brow}${defaultEyes}${tears}`;
  const mouth = id === 0
    ? `<path d="M241 255q15 13 30 0" fill="none" stroke="#6f4930" stroke-width="3.2" stroke-linecap="round"/>`
    : id === 1
    ? `<path d="M234 263q22 29 44 0-3 29-22 31-19-2-22-31z" fill="#663b3b"/><path d="M245 286q11-8 23 0" stroke="#f58b91" stroke-width="4" stroke-linecap="round"/>`
    : id === 4 || id === 11
      ? `<path d="M243 271q13 7 26 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>`
      : id === 5
        ? `<ellipse cx="256" cy="271" rx="10" ry="13" fill="#663b3b"/>`
        : id === 6
          ? `<path d="M239 278q17-16 34 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>`
          : id === 8
            ? `<path d="M237 261q19 18 38 0" fill="#663b3b"/><path d="M249 274q8 16 15 0" fill="#f58b91" stroke="#633c25" stroke-width="2"/>`
            : `<path d="M256 257v7q-9 12-23 2M256 264q9 12 23 2" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  const blush = id === 0 || id === 1 || id === 3
    ? `<ellipse cx="190" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/><ellipse cx="322" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/>`
    : "";
  const whiskers = id === 0
    ? `<path d="M211 251q-24-10-46-6M211 258q-27 0-50 12M211 264q-23 9-40 24M301 251q24-10 46-6M301 258q27 0 50 12M301 264q23 9 40 24" fill="none" stroke="#fff8df" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>`
    : `<path d="M211 257l-43-8M211 266l-47 7M301 257l43-8M301 266l47 7" fill="none" stroke="#784727" stroke-width="3" stroke-linecap="round" opacity=".78"/>`;
  const nose = id === 0
    ? `<path d="M256 235l-8 6 8 7 8-7z" fill="#df7e82" stroke="#80643a" stroke-width="1.7"/>`
    : `<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>`;
  return `<g id="expression">${eyes}${nose}${mouth}${whiskers}${blush}</g>`;
}

export function bodySvg(peel: string, shade: string) {
  return `<g id="body"><defs><linearGradient id="bk-peel" x1=".12" y1=".08" x2=".9" y2=".82"><stop stop-color="#fff9a8"/><stop offset=".28" stop-color="${peel}"/><stop offset=".72" stop-color="${peel}"/><stop offset="1" stop-color="${shade}"/></linearGradient><linearGradient id="bk-fur" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#ffc77e"/><stop offset=".58" stop-color="#e99a50"/><stop offset="1" stop-color="#c87538"/></linearGradient><radialGradient id="bk-muzzle"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f3d5b4"/></radialGradient></defs>
<g id="cat-behind"><g transform="translate(318 405) scale(1.07) translate(-318 -382)"><path d="M318 382c29-2 39 25 61 30 22 5 41-8 42-27 1-15-11-24-22-18-8 4-9 15-2 20 5 4 12 1 14-4 2 10-6 18-16 19-22 3-38-27-77-25z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M342 387q9 15 20 20M362 402q9 10 19 12M385 405q9 5 18 3" fill="none" stroke="#9f572f" stroke-width="5" stroke-linecap="round"/></g><path d="M178 418l-2 39c-16 6-24 19-19 29 6 13 39 14 52 3 9-7 6-21-7-29l2-42zM308 418l2 42c-13 8-16 22-7 29 13 11 46 10 52-3 5-10-3-23-19-29l-2-39z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M162 477q22-9 45 0M305 477q23-9 45 0M176 462q-3 10 0 19M196 461q-2 10 1 19M315 461q-3 10-1 19M336 462q3 10 0 19" fill="none" stroke="#b66c38" stroke-width="3" stroke-linecap="round"/><path d="M171 301c-27 7-48 29-49 53-1 20 13 34 30 28 20-7 30-42 33-74zM341 301c27 7 48 29 49 53 1 20-13 34-30 28-20-7-30-42-33-74z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M143 330q16 3 32 12M139 347q15 4 30 13M370 331q-16 3-32 12M374 348q-15 4-30 13" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/><path d="M139 361q8 10 18 7M373 362q-8 10-18 7" fill="none" stroke="#ffe1b2" stroke-width="4" stroke-linecap="round"/></g><g id="banana-shell"><path d="M239 76c-9-18-10-38-5-56 10-7 24-9 34-4 4 18 2 40-4 58 44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-22 10-51 11-76 4-34-8-60-27-70-58-21-58-21-143-6-216 12-58 38-102 82-126z" fill="url(#bk-peel)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M264 74c44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-10 4-20 6-31 7 26-39 39-97 36-176-3-90-16-165-45-223z" fill="${shade}" opacity=".2"/><path d="M234 20c10-7 24-9 34-4l1 15c-10 8-25 10-36 5z" fill="#79512f" stroke="#65503a" stroke-width="2.4"/><path d="M239 22q12-5 25-3" fill="none" stroke="#c39b71" stroke-width="1.8" stroke-linecap="round"/><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="#744823" stroke="#80643a" stroke-width="2.4"/><path d="M181 122c-20 71-24 157-10 226 12 59 45 101 96 118" fill="none" stroke="#fffbd0" stroke-width="4.2" stroke-linecap="round" opacity=".34"/><path d="M242 104c-14 91-12 181-2 253 8 57 18 91 30 108" fill="none" stroke="#fff8a6" stroke-width="1.8" stroke-linecap="round" opacity=".5"/><path d="M322 115c25 71 31 155 21 226-9 62-33 104-70 124" fill="none" stroke="${shade}" stroke-width="2.2" stroke-linecap="round" opacity=".48"/></g>

<g id="cat"><path d="M171 198c9-39 40-63 85-64 45 1 76 25 85 64 8 51-23 86-85 89-62-3-93-38-85-89z" fill="url(#bk-fur)"/><path d="M216 143q13 17 16 42M256 135v48M296 143q-13 17-16 42" fill="none" stroke="#a95d31" stroke-width="6" stroke-linecap="round"/><path d="M179 230q19 9 37 5M333 230q-19 9-37 5" fill="none" stroke="#c3733d" stroke-width="4" stroke-linecap="round"/><ellipse cx="236" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/><ellipse cx="276" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/></g>
<g id="costume-details"><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="none" stroke="#d8a91c" stroke-width="3.5" opacity=".82"/><path d="M158 412c10 31 36 50 70 58 15 4 30 5 44 3-31-12-55-34-69-65z" fill="#fff37a" opacity=".28"/><path d="M258 462c7 5 19 7 28 1-2 8-7 15-15 17-7-2-12-9-13-18z" fill="#79512f"/><path d="M258 462c1 9 6 16 13 18 8-2 13-9 15-17" fill="none" stroke="#65503a" stroke-width="1.8" stroke-linecap="round"/><path d="M264 468q7 4 15 1" fill="none" stroke="#c39b71" stroke-width="1.5" stroke-linecap="round"/></g></g>`;
}
