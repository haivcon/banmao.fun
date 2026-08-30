export function expressionSvg(id: number) {
  const defaultEyes = `<ellipse cx="220" cy="216" rx="20" ry="24" fill="#6f551e" stroke="#784727" stroke-width="3"/><ellipse cx="292" cy="216" rx="20" ry="24" fill="#6f551e" stroke="#784727" stroke-width="3"/><ellipse cx="220" cy="218" rx="15" ry="19" fill="#211d19"/><ellipse cx="292" cy="218" rx="15" ry="19" fill="#211d19"/><ellipse cx="214" cy="208" rx="6" ry="8" fill="white"/><ellipse cx="286" cy="208" rx="6" ry="8" fill="white"/><circle cx="226" cy="225" r="3" fill="white" opacity=".8"/><circle cx="298" cy="225" r="3" fill="white" opacity=".8"/>`;
  const brow = id === 6 ? `<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>` : "";
  const tears = id === 7 ? `<path d="M207 237q-8 18 4 22 12-6 3-22M305 237q8 18-4 22-12-6-3-22" fill="#71d9ff"/>` : "";
  const eyes = id === 2
    ? `<path d="M199 219q21-16 41 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><ellipse cx="292" cy="216" rx="19" ry="23" fill="#292825"/><ellipse cx="286" cy="208" rx="6" ry="8" fill="white"/><circle cx="298" cy="225" r="3" fill="white" opacity=".8"/>`
    : id === 3
      ? `<path d="M220 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22zM292 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22z" fill="#f05272" stroke="#784727" stroke-width="3"/>`
      : id === 4 || id === 11
        ? `<path d="M199 218q21 16 42 0M271 218q21 16 42 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>`
        : id === 10
          ? `<path d="M220 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2zM292 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2z" fill="#ffd84e" stroke="#6b5320" stroke-width="3"/>`
          : `${brow}${defaultEyes}${tears}`;
  const mouth = id === 1
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
  return `<g id="expression">${eyes}<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>${mouth}<path d="M210 257l-57-10M210 266l-62 9M302 257l57-10M302 266l62 9" fill="none" stroke="#784727" stroke-width="2" stroke-linecap="round" opacity=".68"/>${blush}</g>`;
}

export function bodySvg(peel: string, shade: string) {
  return `<g id="body"><defs><linearGradient id="bk-peel" x1="0" y1="0" x2="1" y2=".72"><stop offset="0" stop-color="#fff8a6"/><stop offset=".26" stop-color="${peel}"/><stop offset=".76" stop-color="${peel}"/><stop offset="1" stop-color="${shade}"/></linearGradient><linearGradient id="bk-fur" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f7bd73"/><stop offset="1" stop-color="#df8b43"/></linearGradient></defs>
<g id="cat-behind"><ellipse cx="260" cy="478" rx="103" ry="10" fill="#302014" opacity=".14"/><path d="M337 397c28 37 64 42 83 19 14-17 5-38-13-40-17-2-28 13-22 28" fill="none" stroke="#df9147" stroke-width="24" stroke-linecap="round"/><path d="M355 414l14-21M381 423l14-22M406 418l12-19" fill="none" stroke="#b76531" stroke-width="4" stroke-linecap="round"/><g transform="rotate(-4 256 440)"><path d="M198 422l-3 38c-16 7-22 20-14 30 10 12 35 9 48-1 9-7 7-19-4-28l-1-39M286 423l1 37c-11 9-12 21-2 29 13 10 38 12 49 1 9-10 2-23-14-30l-4-39" fill="url(#bk-fur)" stroke="#784727" stroke-width="4" stroke-linejoin="round"/><path d="M185 479q18-9 35 1M294 480q17-9 34 1" fill="none" stroke="#ffd49d" stroke-width="4" stroke-linecap="round"/></g></g>
<g id="banana-shell"><path d="M72 390c35-31 59-75 76-128 22-68 57-128 105-176 28-28 47-43 52-57l1-8c1-11 10-18 22-17 12 2 19 11 16 22l-6 24c-4 18 7 37 29 59 43 44 64 101 59 163-6 69-44 127-107 162-60 34-134 37-196 9-21-9-38-22-49-37-11-16-4-27 18-38z" fill="url(#bk-peel)" stroke="#6b5320" stroke-width="4" stroke-linejoin="round"/><path d="M338 50c-4 18 7 37 29 59 43 44 64 101 59 163-6 69-44 127-107 162 29-43 43-93 43-148 0-67-10-147-24-236z" fill="${shade}" opacity=".2"/><path d="M306 21c1-11 10-18 22-17 12 2 19 11 16 22l-3 13c-11 5-26 4-36-2z" fill="#76502d" stroke="#51351f" stroke-width="4" stroke-linejoin="round"/><path d="M313 20q12 5 24 3M312 28q11 5 23 2" fill="none" stroke="#bd9367" stroke-width="2" stroke-linecap="round"/><path d="M89 381c34-37 59-81 79-133 22-57 49-108 86-153M109 421c53 31 120 35 179 11 65-27 105-78 112-144 6-63-14-124-60-174M146 449c50 16 105 12 152-11 54-27 89-72 100-126" fill="none" stroke="${shade}" stroke-width="2.5" stroke-linecap="round" opacity=".42"/><path d="M101 394c35-38 61-82 82-134 22-55 48-102 81-142M132 424c48 22 103 21 153 1 57-23 94-66 108-119" fill="none" stroke="#fff8a6" stroke-width="2" stroke-linecap="round" opacity=".48"/><path d="M77 398c42 44 106 64 168 53 32-6 62-18 88-37" fill="none" stroke="${shade}" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M170 210c17-39 47-60 87-61 42-1 74 20 91 60-1 57-36 91-91 92-54 1-87-32-87-91z" fill="#795323" stroke="#6b5320" stroke-width="3" transform="rotate(5 256 235)"/></g>
<g id="cat" transform="rotate(5 256 235)"><path d="M178 210c13-36 42-55 80-56 40-1 70 19 84 58 3 46-30 79-85 80-53 1-84-32-79-82z" fill="url(#bk-fur)" stroke="#784727" stroke-width="4" stroke-linejoin="round"/><path d="M207 168q18-11 36-12l-7 23M307 168q-16-11-34-12l7 23M252 155l-3 25M265 155l3 25" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/><path d="M189 239q17 11 32 6M325 239q-17 11-32 6" fill="none" stroke="#c3733d" stroke-width="3" stroke-linecap="round"/><ellipse cx="229" cy="263" rx="30" ry="22" fill="#fff1d9"/><ellipse cx="283" cy="263" rx="30" ry="22" fill="#fff1d9"/><path d="M158 305c-22 13-32 38-22 58 9 19 30 20 44 3 12-15 14-36 10-55M349 304c23 11 35 35 27 56-8 20-29 23-44 7-13-14-16-35-14-55" fill="url(#bk-fur)" stroke="#784727" stroke-width="4" stroke-linecap="round"/><path d="M145 328l37 11M143 346l36 10M366 328l-36 12M369 347l-37 11" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/><path d="M143 362q15-1 26 10M369 362q-15 0-25 11" fill="none" stroke="#ffd49d" stroke-width="4" stroke-linecap="round"/></g>
<g id="costume-details"><path d="M83 379c-10 2-17 8-20 15 5 9 14 15 25 15l11-14z" fill="#75502d" stroke="#51351f" stroke-width="3" stroke-linejoin="round"/><path d="M69 393q10 8 20 9" fill="none" stroke="#bd9367" stroke-width="2" stroke-linecap="round"/></g></g>`;
}
