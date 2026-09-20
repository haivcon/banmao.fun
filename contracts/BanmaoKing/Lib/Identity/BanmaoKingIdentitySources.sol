// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {BanmaoKingTraits} from "../../IBanmaoKingRenderer.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
library BanmaoKingIdentityArtwork1 {
    using Strings for uint256;
    function render(uint256 id, uint8 background) internal pure returns (string memory) {
        bytes memory text = bytes(id.toString());
        string memory opening = string.concat('<g class="king-token-badge" transform="', BanmaoKingIdentityLib.BADGE_TRANSFORM, '" fill="', BanmaoKingIdentityLib.ink(background), '">');
        if (text.length > 6) return string.concat(opening, '<title>Token #', string(text), '</title><text x="386" y="40" font-size="8" textLength="112" lengthAdjust="spacingAndGlyphs">#', string(text), '</text></g>');
        // Pre-compute the 11 glyph maps once; avoids allocating string[11]
        // inside every _cell call (up to 105x).
        bytes[11] memory maps;
        maps[0] = '111101101101111'; maps[1] = '010110010010111';
        maps[2] = '111001111100111'; maps[3] = '111001111001111';
        maps[4] = '101101111001001'; maps[5] = '111100111001111';
        maps[6] = '111100111101111'; maps[7] = '111001010010010';
        maps[8] = '111101111101111'; maps[9] = '111101111001111';
        maps[10] = '101111101111101';
        // Merge adjacent chunks in a balanced tree. Repeatedly appending to one
        // growing string copies the entire prefix up to 105 times and inflates EVM memory.
        // This preserves every SVG byte while bounding the copying to O(n log n).
        string[105] memory cells;
        uint256 count = text.length > 4 ? (text.length + 1) * 15 : 75;
        for (uint256 i; i < count; ++i) cells[i] = _cell(id, text, i, maps);
        while (count > 1) {
            uint256 next;
            for (uint256 i; i < count; i += 2) {
                cells[next++] = i + 1 < count ? string.concat(cells[i], cells[i + 1]) : cells[i];
            }
            count = next;
        }
        return string.concat(opening, '<title>Token #', string(text), '</title><g class="king-token-cells">', cells[0], '</g></g>');
    }
    function compositionCode(BanmaoKingTraits memory traits_) internal pure returns (string memory) {
        require(traits_.body < 15 && traits_.expression < 21 && traits_.accessory >= 1 && traits_.accessory <= 25 && traits_.background < 17, "Invalid traits");
        return string.concat("banmao-", _ordinal(traits_.body), _ordinal(traits_.expression), _ordinal(traits_.accessory - 1), _ordinal(traits_.background));
    }
    function _ordinal(uint8 id) private pure returns (string memory) {
        uint256 number = uint256(id) + 1;
        return number < 10 ? string.concat("0", number.toString()) : number.toString();
    }
    function watermark(BanmaoKingTraits memory traits_) internal pure returns (string memory) {
        return string.concat(BanmaoKingIdentityLib.WATERMARK_OPEN, ' fill="', BanmaoKingIdentityLib.ink(traits_.background), '" stroke="', BanmaoKingIdentityLib.outline(traits_.background), '"', BanmaoKingIdentityLib.WATERMARK_FONT, '>', compositionCode(traits_), '</text></g>');
    }
    function _cell(uint256 id, bytes memory text, uint256 i, bytes[11] memory maps) private pure returns (string memory) {
        uint256 glyph = i / 15;
        uint256 cell = i % 15;
        string memory lit;
        {
            bool isLit;
            if (glyph <= text.length) {
                uint256 digit = glyph == 0 ? 10 : uint8(text[glyph - 1]) - 48;
                isLit = maps[digit][cell] == '1';
            }
            lit = isLit ? '1' : '0';
        }
        return _cellShape(id, i, lit);
    }
    function _cellShape(uint256 id, uint256 i, string memory lit) private pure returns (string memory) {
        bool bar = (i / 15) == 0 && ((i % 15) / 3 == 1 || (i % 15) / 3 == 3);
        string memory w = bar ? '6' : (i / 15) == 0 ? '3' : '4';
        uint256 x = (i / 15) == 0 ? 386 + (bar ? (i % 15) % 3 * 6 : 3 + (i % 15) % 3 * 3) : 386 + (i / 15) * 22 + (i % 15) % 3 * 5;
        uint256 y = 25 + (i % 15) / 3 * 5;
        string memory part;
        {
            string memory logoTx = _logoOffset(i, x, false);
            string memory logoTy = _logoOffset(i, y, true);
            part = string.concat('" style="--tx:', logoTx, 'px;--ty:', logoTy, 'px;--sx:');
            part = string.concat(part, _scatterStyle(id, i, x, y));
            part = string.concat(part, 'px;--lit:', lit, ';--cell-width:', w, 'px;--logo-lit:', i < 75 && (i % 15) < 9 ? '1' : '0', '">');
            part = string.concat(part, _motion(id, i, x, y, lit, w, logoTx, logoTy), '</rect>');
        }
        return string.concat('<rect x="', x.toString(), '" y="', y.toString(), '" width="', w, '" height="4" opacity="', lit, part);
    }
    function _scatterStyle(uint256 id, uint256 i, uint256 x, uint256 y) private pure returns (string memory) {
        return string.concat(_delta(384 + (id % 97 + i * 17) % 111, x), 'px;--sy:', _delta(14 + (i * 13 + id % 31) % 43, y));
    }
    function _motion(uint256 id, uint256 i, uint256 x, uint256 y, string memory lit, string memory width, string memory logoTx, string memory logoTy) private pure returns (string memory) {
        string memory motion;
        {
        string memory logo = string.concat(logoTx, ' ', logoTy);
        string memory scatter = string.concat(_delta(384 + (id % 97 + i * 17) % 111, x), ' ', _delta(14 + (i * 13 + id % 31) % 43, y));
        motion = string.concat('<animateTransform attributeName="transform" type="translate" values="0 0;0 0;', scatter, ';', logo, ';', logo, ';', scatter, ';0 0;0 0" keyTimes="0;.2;.3;.42;.64;.76;.88;1" dur="8s" repeatCount="indefinite" additive="sum"/>');
        }
        motion = string.concat(motion, _animate('opacity', lit, i < 75 && i % 15 < 9 ? '1' : '0'));
        return string.concat(motion, _animate('width', width, '3'), _animate('height', '4', '3'));
    }
    function _animate(string memory attribute, string memory base, string memory logo) private pure returns(string memory) {
        return string.concat('<animate attributeName="', attribute, '" values="', base, ';', base, ';', logo, ';', logo, ';', base, ';', base, '" keyTimes="0;.3;.42;.64;.88;1" dur="8s" repeatCount="indefinite"/>');
    }
    // Five solid 7x7 squares (overlapping tiles); extra digit groups reuse positions but remain hidden.
    function _logoOffset(uint256 i, uint256 base, bool vertical) private pure returns (string memory) {
        uint256[5] memory offsets = vertical ? [uint256(1),1,9,17,17] : [uint256(1),17,9,1,17];
        uint256 tile = vertical ? (i % 15) % 9 / 3 : (i % 15) % 3;
        uint256 center = vertical ? BanmaoKingIdentityLib.LOGO_CENTER_Y : BanmaoKingIdentityLib.LOGO_CENTER_X;
        return _delta(center + offsets[(i / 15) % 5] + tile * 2, base);
    }
    function _delta(uint256 a, uint256 b) private pure returns (string memory) {
        return a >= b ? (a - b).toString() : string.concat('-', (b - a).toString());
    }
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
contract BanmaoKingIdentityPart1 {
    function _profile(uint8 id) private pure returns (string memory, string memory, string memory) {
        if (id == 0) return ("4.8", "0 256 333;0 256 333;3 256 333;-2 256 333;3 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;4.2 256 333;-2.73 256 333;1.34 256 333;-0.5 256 333;0 256 333");
        if (id == 1) return ("3.2", "0 256 333;0 256 333;2 256 333;-2 256 333;0 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;4.2 256 333;-2.73 256 333;1.34 256 333;-0.5 256 333;0 256 333");
        if (id == 2) return ("4.6", "0 256 333;0 256 333;5 256 333;3 256 333;0 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;7 256 333;-4.55 256 333;2.24 256 333;-0.84 256 333;0 256 333");
        if (id == 3) return ("5.2", "0 256 333;3 256 333;8 256 333;3 256 333;-7 256 333;-2 256 333;0 256 333", "0 256 333;0 256 333;11.2 256 333;-7.28 256 333;3.58 256 333;-1.34 256 333;0 256 333");
        if (id == 4) return ("8", "0 256 333;0 256 333;1 256 333;1 256 333;-4 256 333;2 256 333;0 256 333", "0 256 333;0 256 333;5.6 256 333;-3.64 256 333;1.79 256 333;-0.67 256 333;0 256 333");
        if (id == 5) return ("4.8", "0 256 333;0 256 333;7 256 333;6 256 333;-2 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;9.8 256 333;-6.37 256 333;3.14 256 333;-1.18 256 333;0 256 333");
        if (id == 6) return ("5.4", "0 256 333;0 256 333;3 256 333;3 256 333;3 256 333;1 256 333;0 256 333", "0 256 333;0 256 333;4.2 256 333;-2.73 256 333;1.34 256 333;-0.5 256 333;0 256 333");
        if (id == 7) return ("6.8", "0 256 333;-1 256 333;-2 256 333;-3 256 333;-3 256 333;-1 256 333;0 256 333", "0 256 333;0 256 333;-4.2 256 333;2.73 256 333;-1.34 256 333;0.5 256 333;0 256 333");
        if (id == 8) return ("3.6", "0 256 333;3 256 333;-7 256 333;7 256 333;-7 256 333;2 256 333;0 256 333", "0 256 333;0 256 333;9.8 256 333;-6.37 256 333;3.14 256 333;-1.18 256 333;0 256 333");
        if (id == 9) return ("7", "0 256 333;0 256 333;0 256 333;-1.5 256 333;-1.5 256 333;-1.5 256 333;0 256 333", "0 256 333;0 256 333;-4.2 256 333;2.73 256 333;-1.34 256 333;0.5 256 333;0 256 333");
        if (id == 10) return ("4.8", "0 256 333;0 256 333;0.5 256 333;0 256 333;0.5 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;4.2 256 333;-2.73 256 333;1.34 256 333;-0.5 256 333;0 256 333");
        if (id == 11) return ("8", "0 256 333;0 256 333;0 256 333;0 256 333;0 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;-4.2 256 333;2.73 256 333;-1.34 256 333;0.5 256 333;0 256 333");
        if (id == 12) return ("7.2", "0 256 333;2 256 333;5 256 333;6 256 333;4 256 333;1 256 333;0 256 333", "0 256 333;0 256 333;8.4 256 333;-5.46 256 333;2.69 256 333;-1.01 256 333;0 256 333");
        if (id == 13) return ("5.8", "0 256 333;3 256 333;6 256 333;-6 256 333;-3 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;8.4 256 333;-5.46 256 333;2.69 256 333;-1.01 256 333;0 256 333");
        if (id == 14) return ("4.4", "0 256 333;0 256 333;-2 256 333;-2 256 333;-2 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;-4.2 256 333;2.73 256 333;-1.34 256 333;0.5 256 333;0 256 333");
        if (id == 15) return ("9", "0 256 333;0 256 333;-3 256 333;3 256 333;-3 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;-4.2 256 333;2.73 256 333;-1.34 256 333;0.5 256 333;0 256 333");
        if (id == 16) return ("5.4", "0 256 333;0 256 333;4 256 333;4 256 333;-3 256 333;-3 256 333;0 256 333", "0 256 333;0 256 333;5.6 256 333;-3.64 256 333;1.79 256 333;-0.67 256 333;0 256 333");
        if (id == 17) return ("4.8", "0 256 333;1 256 333;2 256 333;-2 256 333;0 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;4.2 256 333;-2.73 256 333;1.34 256 333;-0.5 256 333;0 256 333");
        if (id == 18) return ("4.8", "0 256 333;-2 256 333;5 256 333;1 256 333;5 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;-7 256 333;4.55 256 333;-2.24 256 333;0.84 256 333;0 256 333");
        if (id == 19) return ("10", "0 256 333;2 256 333;4 256 333;-4 256 333;-2 256 333;0 256 333;0 256 333", "0 256 333;0 256 333;5.6 256 333;-3.64 256 333;1.79 256 333;-0.67 256 333;0 256 333");
        if (id == 20) return ("7.3", "0 256 333;0 256 333;2 256 333;1 256 333;1 256 333;1 256 333;0 256 333", "0 256 333;0 256 333;4.2 256 333;-2.73 256 333;1.34 256 333;-0.5 256 333;0 256 333");
        revert("Invalid expression");
    }
    function _rotate(string memory values_, string memory times, string memory duration) private pure returns (string memory) {
        return string.concat('<animateTransform attributeName="transform" type="rotate" values="', values_, '" keyTimes="', times, '" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="', duration, 's" repeatCount="indefinite"/>');
    }
    function render(uint8 id) external pure returns (string memory) {
        (string memory duration, string memory lean, string memory swing) = _profile(id);
        return string.concat("<g><defs><linearGradient id=\"king-acc-btc-metal\" x2=\"1\" y2=\"1\"><stop stop-color=\"#fff1ba\"/><stop offset=\".4\" stop-color=\"#db982d\"/><stop offset=\".7\" stop-color=\"#ffe19c\"/><stop offset=\"1\" stop-color=\"#985010\"/></linearGradient></defs><g class=\"king-btc-medallion\"><path d=\"M163 283C178 305 208 326 256 334C304 326 334 305 349 283\" fill=\"none\" stroke=\"#6d360c\" stroke-width=\"10\" stroke-linecap=\"round\"/><path d=\"M163 282C178 304 208 325 256 333C304 325 334 304 349 282\" fill=\"none\" stroke=\"url(#king-acc-btc-metal)\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M164 283C179 304 208 324 256 332C304 324 333 304 348 283\" fill=\"none\" stroke=\"#fff1ba\" stroke-width=\"2\" stroke-dasharray=\"2 5\"/>", '<g data-btc-counter-lean="true">', _rotate(lean, id == 5 ? '0;.26;.3;.43;.58;.82;1' : '0;.12;.3;.43;.58;.82;1', duration), '<g data-btc-counter-turn="true">', _rotate(id == 8 ? '0 256 333;0 256 333;-90 256 333;-180 256 333;-270 256 333;-360 256 333;-360 256 333' : '0 256 333;0 256 333;0 256 333;0 256 333;0 256 333;0 256 333;0 256 333', '0;.12;.3;.43;.58;.82;1', duration), '<g data-btc-pendulum="damped">', _rotate(swing, '0;.18;.38;.54;.7;.86;1', duration), "<ellipse cx=\"256\" cy=\"333\" rx=\"6\" ry=\"9\" fill=\"none\" stroke=\"url(#king-acc-btc-metal)\" stroke-width=\"4\"/><g transform=\"translate(256 364)\"><circle cy=\"3\" r=\"30\" fill=\"#6d360c\"/><circle r=\"30\" fill=\"url(#king-acc-btc-metal)\"/><circle r=\"25\" fill=\"#985010\" stroke=\"#ffe19c\" stroke-width=\"2\"/><circle r=\"22\" fill=\"none\" stroke=\"#eeba54\" opacity=\".5\"/><g transform=\"scale(.7)\"><g transform=\"rotate(14)\" fill=\"none\" stroke=\"#fff1ba\" stroke-width=\"4\" stroke-linejoin=\"round\"><path d=\"M-9-15h12c17 0 17 15 0 15H-9m0 0H5c18 0 18 16 0 16H-9m3-31v31M-3-22v7m8-7v7M-3 16v7m8-7v7\"/></g></g><path d=\"M-24-12A27 27 0 0 1 10-25\" fill=\"none\" stroke=\"#fff1ba\" stroke-width=\"2\"><animate attributeName=\"opacity\" values=\".2;.8;.2\" dur=\"4s\" begin=\"-0s\" repeatCount=\"indefinite\"/></path></g></g></g></g></g></g>");
    }
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
contract BanmaoKingIdentityPart2 {
    error InvalidTrait();

    // Trait dispatch: preserve IDs and the exact authored SVG byte sequence.
    function render(uint8 id) external pure returns(string memory){
        if(id==0)return string.concat(string.concat("<g data-diamond-rays=\"218\">",_s0(),_s1(),_s2(),"</path>"),string.concat(_s3(),_s1(),_s2(),"</path>",_s4()),string.concat(_s1(),_s2(),"</path>",_s5(),_s1()),string.concat(_s2(),"</path>",_s6(),_s1(),_s2()),"</path></g>");
        if(id==1)return string.concat(string.concat("<g data-diamond-rays=\"218\">",_s0(),_s1(),_s2(),"</path>"),string.concat(_s3(),_s1(),_s2(),"</path>",_s4()),string.concat(_s1(),_s2(),"</path>",_s5(),_s1()),string.concat(_s2(),"</path>",_s6(),_s1(),_s2()),string.concat("</path>",_s7(),_s1(),_s2(),"</path></g>"));
        if(id==2)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"218\">",_s0(),_s1(),_s2(),"</path>"),string.concat(_s3(),_s1(),_s2(),"</path>",_s4()),string.concat(_s1(),_s2(),"</path>",_s5(),_s1()),string.concat(_s2(),"</path>",_s6(),_s1(),_s2()),string.concat("</path>",_s7(),_s1(),_s2(),"</path>")),string.concat(_s8(),_s1(),_s2(),"</path></g>"));
        if(id==3)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"218\">",_s0(),_s1(),_s2(),"</path>"),string.concat(_s3(),_s1(),_s2(),"</path>",_s4()),string.concat(_s1(),_s2(),"</path>",_s5(),_s1()),string.concat(_s2(),"</path>",_s6(),_s1(),_s2()),string.concat("</path>",_s7(),_s1(),_s2(),"</path>")),string.concat(string.concat(_s8(),_s1(),_s2(),"</path>",_s9()),string.concat(_s1(),_s2(),"</path></g>")));
        if(id==4)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"218\">",_s0(),_s1(),_s2(),"</path>"),string.concat(_s3(),_s1(),_s2(),"</path>",_s4()),string.concat(_s1(),_s2(),"</path>",_s5(),_s1()),string.concat(_s2(),"</path>",_s6(),_s1(),_s2()),string.concat("</path>",_s7(),_s1(),_s2(),"</path>")),string.concat(string.concat(_s8(),_s1(),_s2(),"</path>",_s9()),string.concat(_s1(),_s2(),"</path>",_s10(),_s1()),string.concat(_s2(),"</path></g>")));
        if(id==5)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"218\">",_s0(),_s1(),_s2(),"</path>"),string.concat(_s3(),_s1(),_s2(),"</path>",_s4()),string.concat(_s1(),_s2(),"</path>",_s5(),_s1()),string.concat(_s2(),"</path>",_s6(),_s1(),_s2()),string.concat("</path>",_s7(),_s1(),_s2(),"</path>")),string.concat(string.concat(_s8(),_s1(),_s2(),"</path>",_s9()),string.concat(_s1(),_s2(),"</path>",_s10(),_s1()),string.concat(_s2(),"</path><path data-diamond-ray=\"218-9\" d=\"M218 214L24 337\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">",_s1(),_s2(),"</path></g>")));
        if(id==6)return string.concat(string.concat("<g data-diamond-rays=\"294\">",_s11(),_s1(),_s2(),"</path>"),string.concat(_s12(),_s1(),_s2(),"</path>",_s13()),string.concat(_s1(),_s2(),"</path>",_s14(),_s1()),string.concat(_s2(),"</path>",_s15(),_s1(),_s2()),"</path></g>");
        if(id==7)return string.concat(string.concat("<g data-diamond-rays=\"294\">",_s11(),_s1(),_s2(),"</path>"),string.concat(_s12(),_s1(),_s2(),"</path>",_s13()),string.concat(_s1(),_s2(),"</path>",_s14(),_s1()),string.concat(_s2(),"</path>",_s15(),_s1(),_s2()),string.concat("</path>",_s16(),_s1(),_s2(),"</path></g>"));
        if(id==8)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"294\">",_s11(),_s1(),_s2(),"</path>"),string.concat(_s12(),_s1(),_s2(),"</path>",_s13()),string.concat(_s1(),_s2(),"</path>",_s14(),_s1()),string.concat(_s2(),"</path>",_s15(),_s1(),_s2()),string.concat("</path>",_s16(),_s1(),_s2(),"</path>")),string.concat(_s17(),_s1(),_s2(),"</path></g>"));
        if(id==9)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"294\">",_s11(),_s1(),_s2(),"</path>"),string.concat(_s12(),_s1(),_s2(),"</path>",_s13()),string.concat(_s1(),_s2(),"</path>",_s14(),_s1()),string.concat(_s2(),"</path>",_s15(),_s1(),_s2()),string.concat("</path>",_s16(),_s1(),_s2(),"</path>")),string.concat(string.concat(_s17(),_s1(),_s2(),"</path>",_s18()),string.concat(_s1(),_s2(),"</path></g>")));
        if(id==10)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"294\">",_s11(),_s1(),_s2(),"</path>"),string.concat(_s12(),_s1(),_s2(),"</path>",_s13()),string.concat(_s1(),_s2(),"</path>",_s14(),_s1()),string.concat(_s2(),"</path>",_s15(),_s1(),_s2()),string.concat("</path>",_s16(),_s1(),_s2(),"</path>")),string.concat(string.concat(_s17(),_s1(),_s2(),"</path>",_s18()),string.concat(_s1(),_s2(),"</path>",_s19(),_s1()),string.concat(_s2(),"</path></g>")));
        if(id==11)return string.concat(string.concat(string.concat("<g data-diamond-rays=\"294\">",_s11(),_s1(),_s2(),"</path>"),string.concat(_s12(),_s1(),_s2(),"</path>",_s13()),string.concat(_s1(),_s2(),"</path>",_s14(),_s1()),string.concat(_s2(),"</path>",_s15(),_s1(),_s2()),string.concat("</path>",_s16(),_s1(),_s2(),"</path>")),string.concat(string.concat(_s17(),_s1(),_s2(),"</path>",_s18()),string.concat(_s1(),_s2(),"</path>",_s19(),_s1()),string.concat(_s2(),"</path><path data-diamond-ray=\"294-9\" d=\"M294 214L488 398\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">",_s1(),_s2(),"</path></g>")));
        revert InvalidTrait();
    }

    // Interned SVG fragments, local to this contract.
    function _s0() private pure returns(string memory){return "<path data-diamond-ray=\"218-0\" d=\"M218 214L24 24\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s1() private pure returns(string memory){return "<animate attributeName=\"opacity\" values=\"0;0;.7;.45;0;0\" keyTimes=\"0;.08;.2;.48;.6;1\" dur=\"3.2s\" repeatCount=\"indefinite\"/>";}
    function _s2() private pure returns(string memory){return "<animate attributeName=\"stroke-dashoffset\" values=\"0;0;-15;-70;-100;-100\" keyTimes=\"0;.08;.2;.48;.6;1\" dur=\"3.2s\" repeatCount=\"indefinite\"/>";}
    function _s3() private pure returns(string memory){return "<path data-diamond-ray=\"218-1\" d=\"M218 214L42 161\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s4() private pure returns(string memory){return "<path data-diamond-ray=\"218-2\" d=\"M218 214L60 298\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s5() private pure returns(string memory){return "<path data-diamond-ray=\"218-3\" d=\"M218 214L24 435\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s6() private pure returns(string memory){return "<path data-diamond-ray=\"218-4\" d=\"M218 214L42 112\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s7() private pure returns(string memory){return "<path data-diamond-ray=\"218-5\" d=\"M218 214L60 249\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s8() private pure returns(string memory){return "<path data-diamond-ray=\"218-6\" d=\"M218 214L24 386\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s9() private pure returns(string memory){return "<path data-diamond-ray=\"218-7\" d=\"M218 214L42 63\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s10() private pure returns(string memory){return "<path data-diamond-ray=\"218-8\" d=\"M218 214L60 200\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s11() private pure returns(string memory){return "<path data-diamond-ray=\"294-0\" d=\"M294 214L488 85\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s12() private pure returns(string memory){return "<path data-diamond-ray=\"294-1\" d=\"M294 214L470 222\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s13() private pure returns(string memory){return "<path data-diamond-ray=\"294-2\" d=\"M294 214L452 359\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s14() private pure returns(string memory){return "<path data-diamond-ray=\"294-3\" d=\"M294 214L488 36\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s15() private pure returns(string memory){return "<path data-diamond-ray=\"294-4\" d=\"M294 214L470 173\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s16() private pure returns(string memory){return "<path data-diamond-ray=\"294-5\" d=\"M294 214L452 310\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s17() private pure returns(string memory){return "<path data-diamond-ray=\"294-6\" d=\"M294 214L488 447\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1.6\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s18() private pure returns(string memory){return "<path data-diamond-ray=\"294-7\" d=\"M294 214L470 124\" fill=\"none\" stroke=\"#e6d5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
    function _s19() private pure returns(string memory){return "<path data-diamond-ray=\"294-8\" d=\"M294 214L452 261\" fill=\"none\" stroke=\"#c5f5ff\" stroke-width=\"1\" stroke-linecap=\"round\" pathLength=\"100\" stroke-dasharray=\"16 184\" stroke-dashoffset=\"0\" opacity=\"0\">";}
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
library BanmaoKingIdentityLib {
    // Anchor the token digits at an equal 8-unit inset from the top and left edges.
    string internal constant BADGE_TRANSFORM = "translate(8 8) scale(.8) translate(-386 -25)";
    // Quarter-scale cluster centers align the 24-unit logo box with the digit height.
    uint256 internal constant LOGO_CENTER_X = 386;
    uint256 internal constant LOGO_CENTER_Y = 25;
    string internal constant WATERMARK_OPEN = '<g class="king-composition-watermark"><text x="506" y="505" text-anchor="end"';
    string internal constant WATERMARK_FONT = ' font-family="monospace" font-size="11" stroke-width="2" stroke-linejoin="round" paint-order="stroke"';
    function light(uint8 background) internal pure returns (bool) {
        return background == 3 || background == 4 || background >= 8;
    }
    function ink(uint8 background) internal pure returns (string memory) {
        return light(background) ? '#fff4cf' : '#342313';
    }
    function outline(uint8 background) internal pure returns (string memory) {
        return light(background) ? '#24182e' : '#fff8e8';
    }
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
contract BanmaoKingIdentityPart3 {function render(uint256 tokenId, BanmaoKingTraits memory traits_) external pure returns (string memory) {
        return string.concat(BanmaoKingIdentityArtwork1.render(tokenId, traits_.background), BanmaoKingIdentityArtwork1.watermark(traits_));
    }}
