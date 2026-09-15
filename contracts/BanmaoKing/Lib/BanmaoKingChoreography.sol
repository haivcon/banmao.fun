// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// Canonical expression choreography. tools/sync-king-choreography.cjs exports these
// literal profiles to the preview. Seven beats: rest, prepare, accent, follow,
// hold, recover, rest. Angles rotate at fixed anatomical anchors.
library BanmaoKingChoreography {
    using Strings for uint256;
    struct Profile { string name; string duration; string left; string right; string footLeft; string footRight; string lean; string lift; string tail; }
    function rotate(string memory target, string memory beats, string memory pivot, string memory duration) internal pure returns (string memory) {
        bytes memory raw = bytes(beats);
        string memory values;
        for (uint256 i; i < raw.length; i++) {
            if (raw[i] == bytes1(';')) values = string.concat(values, ' ', pivot, ';');
            else values = string.concat(values, string(abi.encodePacked(raw[i])));
        }
        return string.concat('<animateTransform href="#smil-', target, '" attributeName="transform" type="rotate" values="', values, ' ', pivot, '"', timing(duration), '/>');
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
    function timing(string memory duration) internal pure returns (string memory) {
        return string.concat(' keyTimes="0;.12;.3;.43;.58;.82;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="', duration, 's" repeatCount="indefinite"');
    }
    // Palm details share the arm's transform; only their visibility is animated.
    function palms(uint8 id, string memory duration) internal pure returns (string memory) {
        bool both = id == 1 || id == 3 || id == 5 || id == 10;
        bool right = both || id == 0 || id == 2;
        string memory leftValues = both ? "0;0;1;.8;.35;0;0" : "0;0;0;0;0;0;0";
        string memory rightValues = right ? "0;0;1;.8;.35;0;0" : "0;0;0;0;0;0;0";
        return string.concat('<animate href="#king-palm-left" attributeName="opacity" values="', leftValues, '"', timing(duration), '/><animate href="#king-palm-right" attributeName="opacity" values="', rightValues, '"', timing(duration), '/>');
    }
    function shape(string memory side, string memory kind, string memory values, string memory duration) internal pure returns (string memory) {
        return string.concat('<animate href="#king-paw-', kind, '-', side, '" attributeName="opacity" values="', values, '" keyTimes="0;.12;.3;.43;.58;.82;1" calcMode="discrete" dur="', duration, 's" repeatCount="indefinite"/>');
    }
    function staffBob(string memory beats, string memory duration) internal pure returns (string memory) {
        bytes memory raw = bytes(beats);
        string memory values = '0 ';
        for (uint256 i; i < raw.length; i++) values = string.concat(values, raw[i] == bytes1(';') ? ';0 ' : string(abi.encodePacked(raw[i])));
        return string.concat('<animateTransform href="#smil-king-staff-bob" attributeName="transform" type="translate" values="', values, '"', timing(duration), '/>');
    }
    function wrist(uint8 id, bool left, string memory duration) internal pure returns (string memory) {
        bool active = id == 1 || id == 3 || id == 5 || id == 10 || (!left && (id == 0 || id == 2));
        string memory side = left ? 'left' : 'right';
        string memory beats = '0;0;0;0;0;0;0';
        if (active) {
            if (id == 3) beats = left ? '0;-10;-14;7;10;-2;0' : '0;10;14;-7;-10;2;0';
            else if (id == 0) beats = '0;0;-10;12;-10;2;0';
            else if (id == 2) beats = '0;0;-5;14;-4;1;0';
            else if (id == 5) beats = left ? '0;0;13;7;9;-1;0' : '0;0;-13;-7;-9;1;0';
            else beats = left ? '0;0;7;-8;6;-2;0' : '0;0;-7;8;-6;2;0';
        }
        string memory open = active ? (id == 3 ? '0;0;0;1;1;0;0' : '0;0;1;1;1;0;0') : '0;0;0;0;0;0;0';
        string memory cupped = id == 3 ? '0;1;1;0;0;0;0' : '0;0;0;0;0;0;0';
        string memory relaxed = active ? (id == 3 ? '1;0;0;0;0;1;1' : '1;1;0;0;0;1;1') : '1;1;1;1;1;1;1';
        return string.concat(left ? '' : string.concat(staffBob(beats, duration), rotate('king-held-wrist', beats, '0 -12', duration), rotate('king-shield-counter-wrist', inverse(beats), '369 357', duration)), rotate(string.concat('king-wrist-', side), beats, '0 -12', duration), shape(side, 'relaxed', relaxed, duration), shape(side, 'open', open, duration), shape(side, 'cupped', cupped, duration));
    }
    function motion(uint8 id) internal pure returns (string memory) {
        Profile memory p = profile(id);
        string memory arms = string.concat(rotate('king-arm-left', p.left, '174 302', p.duration), string.concat(rotate('king-arm-right', p.right, '338 302', p.duration), rotate('king-held-arm', p.right, '338 302', p.duration)));
        string memory legs = string.concat(rotate('king-leg-left', p.footLeft, '190 419', p.duration), rotate('king-leg-right', p.footRight, '322 419', p.duration));
        // Separate nested nodes for rotation and translation: no additive conflicts.
        string memory values = string.concat('0 ', p.lift);
        bytes memory raw = bytes(values);
        values = '';
        for (uint256 i; i < raw.length; i++) values = string.concat(values, raw[i] == bytes1(';') ? ';0 ' : string(abi.encodePacked(raw[i])));
        arms = string.concat(rotate('king-staff-counter-lean', inverse(p.lean), '256 450', p.duration), arms);
        arms = string.concat(rotate('king-shield-counter-arm', inverse(p.right), '369 357', p.duration), rotate('king-shield-counter-lean', inverse(p.lean), '369 357', p.duration), arms);
        return string.concat(wrist(id, true, p.duration), wrist(id, false, p.duration), palms(id, p.duration), arms, legs, rotate('king-character-motion', p.lean, '256 450', p.duration), rotate('king-tail', p.tail, '318 383', p.duration), '<animateTransform href="#king-action-root" attributeName="transform" type="translate" values="', values, '"', timing(p.duration), '/>');
    }
    function profile(uint8 id) internal pure returns (Profile memory) {
        require(id < 21, "Invalid expression");
        if (id == 0) return Profile("Friendly Wave", "4.8", "0;3;8;3;8;2;0", "0;-12;-78;-76;-78;-20;0", "0;0;-2;0;-2;0;0", "0;0;2;0;2;0;0", "0;0;-2;-1;-2;0;0", "0;1;-2;0;-2;0;0", "0;-2;5;-6;5;2;0");
        if (id == 1) return Profile("Joyful Jump", "3.2", "0;-8;88;80;66;10;0", "0;8;-96;-86;-72;-10;0", "0;5;-15;-10;3;0;0", "0;-5;15;10;-3;0;0", "0;0;-1;1;0;0;0", "0;3;-9;-7;1;0;0", "0;3;-8;12;-5;2;0");
        if (id == 2) return Profile("Playful Wink", "4.6", "0;5;20;15;20;4;0", "0;-8;-104;-100;-102;-20;0", "0;0;3;3;2;0;0", "0;0;-4;-4;-2;0;0", "0;1;4;4;2;1;0", "0;0;-1;-1;0;0;0", "0;0;-3;10;3;0;0");
        if (id == 3) return Profile("Send Love", "5.2", "0;20;48;70;78;15;0", "0;-20;-48;-70;-78;-15;0", "0;0;-2;-2;0;0;0", "0;0;2;2;0;0;0", "0;-1;-2;0;2;0;0", "0;1;0;-2;-2;0;0", "0;2;4;7;9;4;0");
        if (id == 4) return Profile("Sleepy Yawn", "8", "0;-3;-6;-4;-3;-1;0", "0;-10;-100;-108;-95;-15;0", "0;1;3;3;2;1;0", "0;-1;-3;-3;-2;-1;0", "0;1;3;5;3;1;0", "0;1;3;4;3;1;0", "0;2;5;7;6;2;0");
        if (id == 5) return Profile("Startled Recoil", "4", "0;-5;104;100;102;10;0", "0;5;-104;-100;-102;-10;0", "0;0;-9;-5;-3;0;0", "0;0;9;5;3;0;0", "0;0;-4;-3;-2;0;0", "0;1;-5;-3;-2;0;0", "0;0;-12;-8;-4;0;0");
        if (id == 6) return Profile("Ready Stance", "5.4", "0;8;35;40;40;12;0", "0;-8;-35;-40;-40;-12;0", "0;-2;-7;-7;-7;-2;0", "0;2;7;7;7;2;0", "0;-1;-2;-2;-2;-1;0", "0;1;3;3;3;1;0", "0;-2;-6;-8;-8;-3;0");
        if (id == 7) return Profile("Wipe Tears", "6.8", "0;12;115;105;115;25;0", "0;3;8;5;8;2;0", "0;0;2;1;2;0;0", "0;0;-2;-1;-2;0;0", "0;1;3;2;3;1;0", "0;1;3;1;3;1;0", "0;2;5;7;6;3;0");
        if (id == 8) return Profile("Silly Shuffle", "3.6", "0;15;65;-10;70;15;0", "0;-15;10;-65;-10;-15;0", "0;2;-8;6;-8;2;0", "0;-2;-6;8;-6;-2;0", "0;-2;4;-4;4;-1;0", "0;0;-2;0;-2;0;0", "0;3;-9;10;-9;3;0");
        if (id == 9) return Profile("Cool Salute", "7", "0;5;25;25;25;5;0", "0;-8;-95;-80;-35;-8;0", "0;0;4;4;4;0;0", "0;0;-2;-2;-2;0;0", "0;1;3;3;3;1;0", "0;0;0;-1;0;0;0", "0;0;2;-4;2;0;0");
        if (id == 10) return Profile("Starstruck Bounce", "4.2", "0;15;92;88;92;20;0", "0;-15;-96;-90;-96;-20;0", "0;0;-4;0;-4;0;0", "0;0;4;0;4;0;0", "0;0;-1;1;-1;0;0", "0;1;-3;0;-3;0;0", "0;-2;6;-7;8;2;0");
        if (id == 11) return Profile("Zen Breathing", "9", "0;5;15;20;15;5;0", "0;-5;-15;-20;-15;-5;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;-1;-2;-1;0;0", "0;1;3;5;3;1;0");
        if (id == 12) return Profile("Cosmic Reach", "7.2", "0;8;25;30;25;8;0", "0;-15;-135;-140;-130;-25;0", "0;0;3;3;2;0;0", "0;0;-3;-3;-2;0;0", "0;-1;-3;-4;-3;-1;0", "0;0;-2;-3;-2;0;0", "0;-3;-7;3;8;3;0");
        if (id == 13) return Profile("Diamond Flourish", "5.8", "0;10;70;85;65;10;0", "0;-5;-25;-35;-25;-5;0", "0;2;5;-2;0;0;0", "0;-2;0;-5;-2;0;0", "0;-2;-4;3;2;0;0", "0;0;-1;-2;-1;0;0", "0;2;6;-4;-6;-2;0");
        if (id == 14) return Profile("Focused Typing", "4.4", "0;20;50;42;52;20;0", "0;-20;-42;-52;-42;-20;0", "0;0;0;0;0;0;0", "0;0;1;0;1;0;0", "0;0;1;1;1;0;0", "0;1;2;2;2;1;0", "0;0;2;-2;2;0;0");
        if (id == 15) return Profile("Monday Sigh", "9.2", "0;-2;-8;-10;-8;-2;0", "0;2;8;10;8;2;0", "0;0;4;4;2;0;0", "0;0;-1;-3;-3;0;0", "0;1;4;4;3;1;0", "0;1;4;4;3;1;0", "0;3;7;9;8;3;0");
        if (id == 16) return Profile("Suspicious Scan", "6.2", "0;5;15;12;15;5;0", "0;-15;-105;-100;-108;-20;0", "0;0;3;0;-2;0;0", "0;0;-1;-3;0;0;0", "0;-1;-4;4;2;0;0", "0;0;1;1;0;0;0", "0;0;-3;0;7;0;0");
        if (id == 17) return Profile("Shy Sway", "6.4", "0;8;30;35;30;8;0", "0;-8;-30;-35;-30;-8;0", "0;1;4;4;3;1;0", "0;-1;-4;-4;-3;-1;0", "0;1;3;-2;3;1;0", "0;0;1;2;1;0;0", "0;2;5;8;6;2;0");
        if (id == 18) return Profile("Victory Pump", "4.8", "0;10;140;110;140;20;0", "0;-5;-30;-25;-30;-5;0", "0;0;-6;-3;-6;0;0", "0;0;3;0;3;0;0", "0;1;-3;-1;-3;0;0", "0;2;-3;-1;-3;0;0", "0;2;-8;10;-6;2;0");
        if (id == 19) return Profile("Dream Drift", "10", "0;6;25;35;25;6;0", "0;-6;-30;-20;-30;-6;0", "0;0;1;2;1;0;0", "0;0;-1;-2;-1;0;0", "0;-1;-2;2;1;0;0", "0;0;-1;-2;-1;0;0", "0;2;4;6;4;2;0");
        return Profile("Royal Command", "7.6", "0;10;70;75;75;15;0", "0;-4;-15;-18;-18;-4;0", "0;0;-2;-2;-2;0;0", "0;0;2;2;2;0;0", "0;0;-1;0;1;0;0", "0;0;-1;-1;0;0;0", "0;-1;-4;-6;-5;-1;0");
    }
}
