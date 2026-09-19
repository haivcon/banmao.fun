// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;

/// @notice Canonical script-free artwork for IDs 24/25. ID 23 remains retired.
library BanmaoKingGrowthProps {
    function candle() internal pure returns (string memory) {
        return string.concat(
            '<g data-green-candle="true" stroke-linejoin="round"><ellipse cy="3" rx="15" ry="5" fill="#075b37" opacity=".25"/><path d="M-12-42H12V0Q0 8-12 0Z" fill="#16bc61" stroke="#087846" stroke-width="2"/><path d="M4-41H11V0Q7 3 4 3Z" fill="#07944d"/><path d="M-8-36V-7" stroke="#b1ffb2" stroke-width="3" stroke-linecap="round"/><ellipse cy="-42" rx="12" ry="4" fill="#a2ff9c" stroke="#087846" stroke-width="1.5"/><path d="M-10-41V-29Q-7-24-5-30V-39M5-40V-33Q8-28 10-34" fill="#7bee8d"/><path d="M0-43V-50" stroke="#264c32" stroke-width="2"/>',
            '<g data-green-flame="true"><ellipse cy="-62" rx="23" ry="29" fill="#58ff79" opacity=".13"><animate attributeName="opacity" values=".08;.22;.12;.08" dur="1.6s" repeatCount="indefinite"/></ellipse><path fill="#22eb69" stroke="#0ebc56" d="M0-85C-4-73-15-64-10-54Q0-43 10-55C16-67 3-71 0-85Z"><animate attributeName="d" values="M0-85C-4-73-15-64-10-54Q0-43 10-55C16-67 3-71 0-85Z;M5-88C-7-74-13-65-10-54Q0-43 10-55C15-65 0-73 5-88Z;M-3-82C-2-73-16-63-10-54Q0-43 10-55C17-69 2-71-3-82Z;M0-85C-4-73-15-64-10-54Q0-43 10-55C16-67 3-71 0-85Z" dur="1.2s" repeatCount="indefinite"/></path><path d="M0-70Q-10-53 0-49Q10-54 0-70Z" fill="#d9ffad"><animate attributeName="opacity" values=".65;1;.8;.65" dur=".8s" repeatCount="indefinite"/></path></g></g>'
        );
    }
    // Keep the canonical shoulder, forearm and palm geometry, just select its grip pose.
    function gripStyle() private pure returns (string memory) {
        return '<style>:is([data-accessory="24"],[data-accessory="25"]) .king-arm-right :is(.king-paw-relaxed,.king-paw-open,.king-paw-edge){display:none}:is([data-accessory="24"],[data-accessory="25"]) .king-arm-right .king-paw-cupped{opacity:1!important}</style>';
    }
    // Candle base is 10 units outward and 14 units toward the fingers from the
    // wrist anchor. Offset the carrier, not the upright art, to retain all counters.
    function front(uint8 id) internal pure returns (string memory) {
        if (id == 24) return string.concat('<g id="accessory" data-prop="green-growth-candle">', gripStyle(), '<g id="smil-king-held-arm"><g transform="translate(379 371)"><g id="smil-king-held-wrist"><g transform="translate(-369 -357)"><g id="smil-king-staff-counter-turn"><g transform="translate(369 345)" data-upright-candle="true">', candle(), '</g></g></g></g></g></g></g>');
        require(id == 25, "Invalid growth prop");
        return string.concat(
            '<g id="accessory" data-prop="ruby-wine-glass">', gripStyle(),
            // Move the carrier toward the palm, preserving the upright rotation pivots.
            '<g id="smil-king-held-arm"><g transform="translate(379 371)"><g id="smil-king-held-wrist"><g transform="translate(-369 -357)"><g id="smil-king-staff-counter-turn"><g transform="translate(369 345)" data-wine-grip="true" stroke-linejoin="round">',
            '<defs><linearGradient id="bk-wine-crystal"><stop stop-color="#b9e9fa" stop-opacity=".5"/><stop offset=".28" stop-color="#fff" stop-opacity=".12"/><stop offset=".7" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#b2dbea" stop-opacity=".65"/></linearGradient><linearGradient id="bk-wine-ruby" x2=".8" y2="1"><stop stop-color="#eb476c"/><stop offset=".45" stop-color="#a50f42"/><stop offset="1" stop-color="#450e30"/></linearGradient><linearGradient id="bk-wine-gold"><stop stop-color="#ad7334"/><stop offset=".45" stop-color="#fff0b7"/><stop offset="1" stop-color="#c89543"/></linearGradient></defs>',
            '<ellipse cx="0" cy="19" rx="16" ry="4" fill="url(#bk-wine-crystal)" stroke="#e4edf0" stroke-width="1.3"/><path d="M-2-21V13Q-2 17-11 18H11Q2 17 2 13V-21" fill="url(#bk-wine-crystal)" stroke="#e5f5fa" stroke-width="1.2"/><path data-wine-bowl="true" d="M-20-78C-23-60-28-41-15-28Q0-14 15-28C28-41 23-60 20-78Z" fill="url(#bk-wine-crystal)" stroke="#d3ebf2" stroke-width="1.6"/>',
            '<path data-wine-liquid="true" d="M-22-53Q0-47 22-53C24-41 18-29 8-25Q0-22-8-25C-18-29-24-41-22-53Z" fill="url(#bk-wine-ruby)"/><ellipse cx="0" cy="-53" rx="22" ry="4" fill="#f47794" opacity=".8"><animate attributeName="ry" values="4;2.5;4" dur="3s" repeatCount="indefinite"/></ellipse><path d="M-18-48Q-16-32-6-29" fill="none" stroke="#ffb2bd" stroke-width="1.5" opacity=".65"/>',
            '<ellipse cx="0" cy="-78" rx="20" ry="4" fill="none" stroke="url(#bk-wine-gold)" stroke-width="2"/><path d="M-15-71Q-19-60-18-56M17-69Q22-47 14-35" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><path d="M0-18V-5M-9 18H7" stroke="#fff" stroke-width="1.2" opacity=".9"/><path d="M-3-3H3V2H-3Z" fill="url(#bk-wine-gold)"/>',
            '<g data-wine-shine="true" fill="#fff9e7" opacity=".2"><animate attributeName="opacity" values=".2;1;.2" dur="3s" repeatCount="indefinite"/><path d="M-18-82L-16-76-10-74-16-72-18-66-20-72-26-74-20-76ZM20-49L22-44 27-42 22-40 20-35 18-40 13-42 18-44Z"/></g></g></g></g></g></g></g></g>'
        );
    }
    function world() internal pure returns (string memory result) {
        result = string.concat('<g data-growth-world="true"><defs><g id="bk-rising-candle">', candle(), '</g></defs>');
        string[6] memory xs = ['52','106','406','460','78','434'];
        string[6] memory phases = ['0','-1','-2','-3','-4','-5'];
        for (uint8 i; i < 6; i++) result = string.concat(result,
            '<g transform="translate(', xs[i], ' 0)"><g data-rising-candle="true"><animateTransform attributeName="transform" type="translate" values="0 490;8 290;-6 70" keyTimes="0;.55;1" dur="6s" begin="', phases[i], 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.75;.65;0" keyTimes="0;.12;.75;1" dur="6s" begin="', phases[i], 's" repeatCount="indefinite"/><use href="#bk-rising-candle" transform="scale(.55)"/></g></g>');
        return string.concat(result, '</g>');
    }
}
