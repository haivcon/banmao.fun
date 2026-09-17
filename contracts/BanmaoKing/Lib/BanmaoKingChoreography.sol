// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {BanmaoKingDirection as D} from "./BanmaoKingDirection.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// Canonical expression choreography. tools/sync-king-choreography.cjs exports these
// literal profiles to the preview. Seven beats: rest, prepare, accent, follow,
// hold, recover, rest. Angles rotate at fixed anatomical anchors.
library BanmaoKingChoreography {
    using Strings for uint256;
    struct Profile { string name; string duration; string left; string right; string footLeft; string footRight; string lean; string lift; string tail; }
    function rotate(string memory target, string memory beats, string memory pivot, string memory duration) internal pure returns (string memory) {
        return rotateMode(target, beats, pivot, duration, '');
    }
    function rotateMode(string memory target, string memory beats, string memory pivot, string memory duration, string memory mode) internal pure returns (string memory) {
        bytes memory raw = bytes(beats);
        string memory values;
        for (uint256 i; i < raw.length; i++) {
            if (raw[i] == bytes1(';')) values = string.concat(values, ' ', pivot, ';');
            else values = string.concat(values, string(abi.encodePacked(raw[i])));
        }
        return string.concat('<animateTransform href="#smil-', target, '" attributeName="transform" type="rotate"', mode, ' values="', values, ' ', pivot, '"', timing(duration), '/>');
    }
    function inverse(string memory beats) internal pure returns (string memory result) {
        bytes memory raw = bytes(beats);
        bool start = true;
        for (uint256 i; i < raw.length; i++) {
            bytes1 c = raw[i];
            if (c == bytes1(';')) { result = string.concat(result, ';'); start = true; }
            else if (start) {
                if (c != bytes1('-')) result = string.concat(result, c == bytes1('0') ? '' : '-', string(abi.encodePacked(c)));
                start = false;
            } else result = string.concat(result, string(abi.encodePacked(c)));
        }
    }
    function directed(uint8 id, bool left, string memory duration) internal pure returns (string memory) {
        string memory e = D.ease(id);
        return string.concat(' keyTimes="', left ? D.leftTime(id) : D.rightTime(id), '" calcMode="spline" keySplines="', e, ';', e, ';', e, ';', e, ';', e, ';', e, '" dur="', duration, 's" repeatCount="indefinite"');
    }
    function timing(string memory duration) internal pure returns (string memory) {
        if (bytes(duration)[0] == bytes1(' ')) return duration;
        return string.concat(' keyTimes="0;.12;.3;.43;.58;.82;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="', duration, 's" repeatCount="indefinite"');
    }
    function shape(uint8 id, string memory side, string memory kind, string memory values, string memory duration) internal pure returns (string memory) {
        return string.concat('<animate href="#king-paw-', kind, '-', side, '" attributeName="opacity" values="', values, '" keyTimes="', keccak256(bytes(side)) == keccak256(bytes('left')) ? D.leftTime(id) : D.rightTime(id), '" calcMode="discrete" dur="', duration, 's" repeatCount="indefinite"/>');
    }
    function staffBob(string memory beats, string memory duration) internal pure returns (string memory) {
        bytes memory raw = bytes(beats);
        string memory values = '0 ';
        for (uint256 i; i < raw.length; i++) values = string.concat(values, raw[i] == bytes1(';') ? ';0 ' : string(abi.encodePacked(raw[i])));
        return string.concat('<animateTransform href="#smil-king-staff-bob" attributeName="transform" type="translate" values="', values, '"', timing(duration), '/>');
    }
    function wrist(uint8 id, bool left, string memory duration) internal pure returns (string memory) {

        string memory side = left ? 'left' : 'right';
        string memory result;
        {
        bool cup = id == 3 || id == 4 || id == 13 || id == 17;
        bool closed = id == 6 || id == 15 || id == 18 || (left && (id == 0 || id == 2 || id == 4));
        result = shape(id, side, 'relaxed', closed ? '1;1;1;1;1;1;1' : '1;0;0;0;0;0;1', duration);
        result = string.concat(result, shape(id, side, 'open', !cup && !closed ? '0;0;1;1;1;0;0' : '0;0;0;0;0;0;0', duration));
        result = string.concat(result, shape(id, side, 'cupped', cup && !closed ? '0;0;1;1;1;0;0' : '0;0;0;0;0;0;0', duration));
        result = string.concat(result, shape(id, side, 'edge', closed ? '0;0;0;0;0;0;0' : '0;1;0;0;0;1;0', duration));
        }
        string memory beats = left ? D.wristLeft(id) : D.wrist(id);
        string memory t = directed(id, left, duration);
        result = string.concat(rotate(string.concat('king-prop-wrist-', side), beats, '0 -12', t), rotate(string.concat('king-wrist-', side), beats, '0 -12', t), result);
        if (!left) result = string.concat(staffBob(beats, t), rotate('king-held-wrist', inverse(profile(id).right), '0 -12', t), rotateMode('king-held-wrist', inverse(profile(id).lean), '0 -12', duration, ' additive="sum"'), rotate('king-shield-counter-wrist', inverse(beats), '369 357', t), result);
        return result;
    }
    function motion(uint8 id) internal pure returns (string memory) {
        Profile memory p = profile(id);
        string memory l = directed(id, true, p.duration);
        string memory r = directed(id, false, p.duration);
        string memory arms = string.concat(rotate('king-held-arm-left', p.left, '174 302', l), rotate('king-arm-left', p.left, '174 302', l), string.concat(rotate('king-arm-right', p.right, '338 302', r), rotate('king-held-arm', p.right, '338 302', r)));
        string memory legs = string.concat(rotate('king-leg-left', p.footLeft, '190 419', l), rotate('king-leg-right', p.footRight, '322 419', r));
        // Separate nested nodes for rotation and translation: no additive conflicts.
        string memory values = string.concat('0 ', p.lift);
        bytes memory raw = bytes(values);
        values = '';
        for (uint256 i; i < raw.length; i++) values = string.concat(values, raw[i] == bytes1(';') ? ';0 ' : string(abi.encodePacked(raw[i])));
        arms = string.concat(rotate('king-staff-counter-arm', inverse(p.right), '369 345', r), rotate('king-staff-counter-wrist', inverse(D.wrist(id)), '369 345', r), rotate('king-staff-counter-lean', inverse(p.lean), '369 345', p.duration), arms);
        arms = string.concat(rotate('king-shield-counter-arm', inverse(p.right), '369 357', r), rotate('king-shield-counter-lean', inverse(p.lean), '369 357', p.duration), arms);
        arms = string.concat(wrist(id, true, p.duration), wrist(id, false, p.duration), arms, legs);
        arms = string.concat(arms, rotate('king-character-motion', p.lean, '256 450', p.duration), rotate('king-tail', p.tail, '318 383', r));
        return string.concat(arms, '<animateTransform href="#king-action-root" attributeName="transform" type="translate" values="', values, '"', timing(p.duration), '/>');
    }
    function profile(uint8 id) internal pure returns (Profile memory) {
        require(id < 21, "Invalid expression");
        if (id == 0) return Profile("Friendly Wave", "4.8", "0;2;5;2;5;1;0", "0;-25;-85;-62;-90;-30;0", "0;0;0;0;0;0;0", "0;2;-8;0;-8;0;0", "0;0;-3;-2;-3;0;0", "0;1;-2;0;-2;0;0", "0;2;14;-10;14;2;0");
        if (id == 1) return Profile("Joyful Jump", "3.2", "0;-12;125;105;45;8;0", "0;10;-115;-130;-40;-6;0", "0;8;-22;-18;6;0;0", "0;-8;20;24;-6;0;0", "0;0;-2;2;0;0;0", "0;4;-22;-16;3;0;0", "0;5;-22;18;-10;3;0");
        if (id == 2) return Profile("Playful Wink", "4.6", "0;12;28;28;20;4;0", "0;-20;-105;-80;-102;-12;0", "0;0;0;0;0;0;0", "0;2;-12;-10;0;0;0", "0;1;6;5;2;0;0", "0;0;-2;-2;0;0;0", "0;-4;12;20;8;0;0");
        if (id == 3) return Profile("Send Love", "5.2", "0;28;100;68;35;8;0", "0;-22;-95;-62;-30;-6;0", "0;1;-4;-2;0;0;0", "0;-1;4;2;0;0;0", "0;-2;-4;0;3;1;0", "0;2;3;-3;-1;0;0", "0;-3;-8;4;12;5;0");
        if (id == 4) return Profile("Sleepy Yawn", "8", "0;-5;-14;-18;-10;-3;0", "0;-18;-108;-112;-65;-10;0", "0;2;6;8;5;1;0", "0;-2;-5;-7;-4;-1;0", "0;2;5;7;5;1;0", "0;1;4;6;4;1;0", "0;4;10;16;18;8;0");
        if (id == 5) return Profile("Startled Recoil", "4", "0;-10;120;100;55;8;0", "0;8;-108;-120;-50;-6;0", "0;2;-20;-12;-5;0;0", "0;-2;18;14;4;0;0", "0;0;-7;-5;-2;0;0", "0;2;-12;-5;2;0;0", "0;2;-28;-26;-15;-4;0");
        if (id == 6) return Profile("Ready Stance", "5.4", "0;15;55;65;55;16;0", "0;-8;-38;-48;-38;-10;0", "0;-4;-14;-14;-14;-4;0", "0;4;14;14;14;4;0", "0;-1;-4;-4;-3;-1;0", "0;2;5;5;4;1;0", "0;-4;-14;-14;-12;-5;0");
        if (id == 7) return Profile("Wipe Tears", "6.8", "0;25;118;98;118;30;0", "0;2;5;3;5;1;0", "0;1;5;3;5;1;0", "0;-1;-3;-2;-3;0;0", "0;2;5;3;5;1;0", "0;1;5;2;5;1;0", "0;4;12;16;14;6;0");
        if (id == 8) return Profile("Silly Shuffle", "3.6", "0;25;80;-18;85;20;0", "0;-10;18;-85;15;-20;0", "0;4;-18;14;-18;3;0", "0;-4;-14;18;-14;-3;0", "0;-3;7;-7;7;-2;0", "0;1;-4;1;-4;0;0", "0;6;-24;24;-22;6;0");
        if (id == 9) return Profile("Cool Salute", "7", "0;3;12;12;10;2;0", "0;-20;-98;-98;-35;-6;0", "0;0;2;2;2;0;0", "0;0;-6;-6;-4;0;0", "0;1;4;4;3;1;0", "0;0;-1;-1;0;0;0", "0;0;-4;-4;3;1;0");
        if (id == 10) return Profile("Starstruck Bounce", "4.2", "0;20;100;55;105;15;0", "0;-18;-92;-48;-100;-12;0", "0;2;-10;0;-12;0;0", "0;-2;10;0;12;0;0", "0;0;-2;2;-2;0;0", "0;3;-10;2;-12;1;0", "0;-4;22;-18;24;4;0");
        if (id == 11) return Profile("Zen Breathing", "9", "0;6;18;24;18;6;0", "0;-6;-18;-24;-18;-6;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;-1;-2;-1;0;0", "0;1;2;3;2;1;0");
        if (id == 12) return Profile("Cosmic Reach", "7.2", "0;8;35;42;32;8;0", "0;-25;-135;-145;-125;-20;0", "0;0;5;8;4;0;0", "0;0;-6;-10;-5;0;0", "0;-2;-5;-6;-4;-1;0", "0;0;-5;-8;-4;0;0", "0;-3;-10;-16;-8;2;0");
        if (id == 13) return Profile("Diamond Flourish", "5.8", "0;20;95;60;105;12;0", "0;-8;-25;-50;-20;-4;0", "0;3;10;-6;2;0;0", "0;-2;2;-12;-3;0;0", "0;-3;-6;6;3;0;0", "0;0;-2;-4;-1;0;0", "0;-4;-14;14;18;4;0");
        if (id == 14) return Profile("Focused Typing", "4.4", "0;25;58;35;60;18;0", "0;-20;-35;-60;-35;-15;0", "0;0;0;0;0;0;0", "0;0;3;0;3;0;0", "0;0;2;2;2;0;0", "0;1;3;3;3;1;0", "0;0;2;-4;2;0;0");
        if (id == 15) return Profile("Monday Sigh", "9.2", "0;-4;-15;-22;-18;-5;0", "0;3;10;16;12;3;0", "0;1;8;10;5;1;0", "0;-1;-2;-6;-7;-2;0", "0;2;6;8;6;2;0", "0;2;6;8;6;2;0", "0;5;16;22;20;10;0");
        if (id == 16) return Profile("Suspicious Scan", "6.2", "0;8;24;24;20;4;0", "0;-25;-108;-108;-92;-16;0", "0;0;8;0;-5;0;0", "0;0;-3;-8;0;0;0", "0;-2;-7;7;3;0;0", "0;0;2;2;0;0;0", "0;0;-12;-12;16;0;0");
        if (id == 17) return Profile("Shy Sway", "6.4", "0;-4;-12;-16;-12;-3;0", "0;3;10;14;10;2;0", "0;2;7;3;7;1;0", "0;-1;-3;-7;-3;-1;0", "0;2;5;-5;4;1;0", "0;0;2;3;2;0;0", "0;4;12;20;14;4;0");
        if (id == 18) return Profile("Victory Pump", "4.8", "0;20;145;85;145;20;0", "0;-10;-42;-28;-48;-8;0", "0;3;-16;-5;-18;0;0", "0;-2;8;0;10;0;0", "0;2;-5;-1;-5;0;0", "0;3;-14;1;-16;1;0", "0;4;-22;22;-18;3;0");
        if (id == 19) return Profile("Dream Drift", "10", "0;8;32;42;28;8;0", "0;-4;-18;-30;-38;-8;0", "0;0;2;3;2;0;0", "0;0;-1;-2;-3;0;0", "0;-2;-4;4;2;0;0", "0;0;-3;-5;-3;0;0", "0;-4;-10;2;12;5;0");
        return Profile("Royal Command", "7.6", "0;18;85;85;65;12;0", "0;-3;-12;-12;-10;-2;0", "0;0;-5;-5;-5;0;0", "0;0;5;5;5;0;0", "0;0;-2;-2;1;0;0", "0;0;-2;-2;0;0;0", "0;-2;-10;-10;-7;-2;0");
    }
}
