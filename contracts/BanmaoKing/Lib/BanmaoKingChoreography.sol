// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
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
    function bodyTiming(uint8 id, string memory duration) internal pure returns (string memory) {
        if (id == 5) return string.concat(' keyTimes="0;.26;.3;.43;.58;.82;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="', duration, 's" repeatCount="indefinite"');
        if (id == 16) return string.concat(' keyTimes="0;.12;.25;.5;.75;.88;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="', duration, 's" repeatCount="indefinite"');
        return timing(duration);
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
        bool closed = id == 6 || id == 15 || id == 18 || (left && (id == 0 || id == 2));
        result = shape(id, side, 'relaxed', closed ? '1;1;1;1;1;1;1' : '1;0;0;0;0;0;1', duration);
        result = string.concat(result, shape(id, side, 'open', !cup && !closed ? '0;0;1;1;1;0;0' : '0;0;0;0;0;0;0', duration));
        result = string.concat(result, shape(id, side, 'cupped', cup && !closed ? '0;0;1;1;1;0;0' : '0;0;0;0;0;0;0', duration));
        result = string.concat(result, shape(id, side, 'edge', closed ? '0;0;0;0;0;0;0' : '0;1;0;0;0;1;0', duration));
        }
        string memory beats = left ? D.wristLeft(id) : D.wrist(id);
        string memory t = directed(id, left, duration);
        result = string.concat(rotate(string.concat('king-prop-wrist-', side), beats, '0 -12', t), rotate(string.concat('king-wrist-', side), beats, '0 -12', t), result);
        if (!left) result = string.concat(staffBob(beats, t), rotate('king-held-wrist', inverse(profile(id).right), '0 -12', t), rotateMode('king-held-wrist', inverse(profile(id).lean), '0 -12', bodyTiming(id, duration), ' additive="sum"'), rotate('king-shield-counter-wrist', inverse(beats), '369 357', t), result);
        return result;
    }
    // Bounded delayed pose-change approximation, matching the preview (not CFD).
    function coffeeSlosh(uint8 id, Profile memory p) internal pure returns (string memory) {
        bytes memory raw = bytes(p.right);
        int256 previous;
        int256 current;
        bool negative;
        uint256 beat;
        string memory values;
        for (uint256 i; i <= raw.length; i++) {
            if (i == raw.length || raw[i] == bytes1(';')) {
                int256 angle = negative ? -current : current;
                int256 tilt = beat == 0 || beat == 6 ? int256(0) : (angle - previous) / 12;
                if (tilt > 4) tilt = 4;
                if (tilt < -4) tilt = -4;
                values = string.concat(values, beat == 0 ? '' : ';', tilt < 0 ? '-' : '', uint256(tilt < 0 ? -tilt : tilt).toString(), ' 406 334');
                previous = angle;
                current = 0;
                negative = false;
                beat++;
            } else if (raw[i] == bytes1('-')) negative = true;
            else current = current * 10 + int256(uint256(uint8(raw[i]) - 48));
        }
        return string.concat('<animateTransform href="#smil-king-coffee-liquid" begin=".12s" attributeName="transform" type="rotate" values="', values, '"', directed(id, false, p.duration), '/>');
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
        arms = string.concat(rotate('king-staff-counter-arm', inverse(p.right), '369 345', r), rotate('king-staff-counter-wrist', inverse(D.wrist(id)), '369 345', r), rotate('king-staff-counter-lean', inverse(p.lean), '369 345', bodyTiming(id, p.duration)), arms);
        arms = string.concat(rotate('king-shield-counter-arm', inverse(p.right), '369 357', r), rotate('king-shield-counter-lean', inverse(p.lean), '369 357', bodyTiming(id, p.duration)), arms);
        arms = string.concat(wrist(id, true, p.duration), wrist(id, false, p.duration), arms, legs);
        arms = string.concat(arms, rotate('king-character-motion', p.lean, '256 450', bodyTiming(id, p.duration)), rotate('king-tail', p.tail, '318 383', r));
        return string.concat(coffeeSlosh(id, p), arms, '<animateTransform href="#king-action-root" attributeName="transform" type="translate" values="', values, '"', bodyTiming(id, p.duration), '/>');
    }
    function profile(uint8 id) internal pure returns (Profile memory) {
        require(id < 21, "Invalid expression");
        if (id == 0) return Profile("Friendly Wave", "4.8", "0;6;18;10;18;4;0", "0;-25;-85;-62;-90;-30;0", "0;0;0;-6;0;0;0", "0;2;-8;0;-8;0;0", "0;0;-3;2;-3;0;0", "0;1;-2;0;-2;0;0", "0;4;18;-14;18;4;0");
        if (id == 1) return Profile("Joyful Jump", "3.2", "0;-12;125;105;45;8;0", "0;10;-115;-130;-40;-6;0", "0;8;-22;-18;6;0;0", "0;-8;20;24;-6;0;0", "0;0;-2;2;0;0;0", "0;4;-22;-16;3;0;0", "0;5;-22;18;-10;3;0");
        if (id == 2) return Profile("Playful Wink", "4.6", "0;2;8;5;2;0;0", "0;-4;-28;-18;-4;0;0", "0;0;0;0;0;0;0", "0;0;-2;-1;0;0;0", "0;0;-5;-3;0;0;0", "0;0;-2;-1;0;0;0", "0;-2;3;12;4;0;0");
        if (id == 3) return Profile("Send Love", "5.2", "0;28;100;68;35;8;0", "0;-22;-95;-62;-30;-6;0", "0;1;-4;-2;0;0;0", "0;-1;4;2;0;0;0", "0;-3;-8;-3;7;2;0", "0;2;-5;-2;-4;0;0", "0;-4;-7;-3;4;6;0");
        if (id == 4) return Profile("Sleepy Yawn", "8", "0;8;105;105;18;-4;0", "0;-1;-4;-4;-3;-10;0", "0;0;0;0;0;0;0", "0;0;0;0;2;-3;0", "0;0;-1;-1;4;-2;0", "0;0;0;0;3;0;0", "0;0;1;1;5;3;0");
        if (id == 5) return Profile("Startled Recoil", "4.8", "0;-3;65;55;18;0;0", "0;4;-85;-75;-20;0;0", "0;2;-12;-8;2;0;0", "0;-2;10;8;-2;0;0", "0;0;-7;-6;2;0;0", "0;2;-12;-9;2;0;0", "0;0;-22;-18;-5;0;0");
        if (id == 6) return Profile("Ready Stance", "5.4", "0;4;22;18;18;4;0", "0;-8;-65;-50;-50;-8;0", "0;0;6;6;6;2;0", "0;0;-6;-6;-6;-2;0", "0;0;-3;-3;-3;-1;0", "0;1;2;2;2;0;0", "0;-2;-10;-10;-10;-3;0");
        if (id == 7) return Profile("Wipe Tears", "6.8", "0;0;8;60;108;10;0", "0;1;3;4;4;1;0", "0;0;3;-2;3;0;0", "0;0;-3;2;-3;0;0", "0;1;2;3;3;1;0", "0;1;2;3;2;1;0", "0;3;9;14;12;4;0");
        if (id == 8) return Profile("Silly Shuffle", "3.6", "0;8;24;-6;26;6;0", "0;-25;-80;18;-85;-20;0", "0;4;-18;14;-18;3;0", "0;-4;-14;18;-14;-3;0", "0;-3;7;-7;7;-2;0", "0;1;-4;1;-4;0;0", "0;6;-24;24;-22;6;0");
        if (id == 9) return Profile("Cool Gaze", "7", "0;2;12;8;8;8;0", "0;-8;-65;-45;-45;-45;0", "0;0;0;0;0;0;0", "0;0;0;-3;-3;-3;0", "0;0;0;1.5;1.5;1.5;0", "0;0;0;0;0;0;0", "0;0;-1;-3;-3;-3;0");
        if (id == 10) return Profile("Starstruck Bounce", "4.8", "0;4;28;25;28;8;0", "0;-12;-85;-78;-85;-25;0", "0;0;-3;0;-3;0;0", "0;0;3;0;3;0;0", "0;0;-.5;0;-.5;0;0", "0;1;-2;0;-2;0;0", "0;0;-2;1;-2;0;0");
        if (id == 11) return Profile("Zen Breathing", "8", "0;4;14;20;14;4;0", "0;-4;-14;-20;-14;-4;0", "0;0;2;3;2;0;0", "0;0;-2;-3;-2;0;0", "0;0;0;0;0;0;0", "0;0;-3;-5;-3;0;0", "0;1;4;8;6;2;0");
        if (id == 12) return Profile("Cosmic Reach", "7.2", "0;8;35;42;32;8;0", "0;-25;-135;-145;-125;-20;0", "0;0;5;8;4;0;0", "0;0;-6;-10;-5;0;0", "0;-2;-5;-6;-4;-1;0", "0;0;-5;-8;-4;0;0", "0;-3;-10;-16;-8;2;0");
        if (id == 13) return Profile("Diamond Flourish", "5.8", "0;6;28;18;30;4;0", "0;-20;-95;-60;-105;-12;0", "0;3;10;-6;2;0;0", "0;-2;2;-12;-3;0;0", "0;-3;-6;6;3;0;0", "0;0;-2;-4;-1;0;0", "0;-4;-14;14;18;4;0");
        if (id == 14) return Profile("Focused Typing", "4.4", "0;25;58;35;60;18;0", "0;-20;-35;-60;-35;-15;0", "0;0;0;0;0;0;0", "0;0;3;0;3;0;0", "0;0;2;2;2;0;0", "0;1;3;3;3;1;0", "0;0;2;-4;2;0;0");
        if (id == 15) return Profile("Whistling Sway", "9", "0;1;5;-3;5;1;0", "0;-3;-16;8;-16;-3;0", "0;0;0;-6;0;0;0", "0;0;7;0;7;0;0", "0;0;3;-3;3;0;0", "0;0;-1;0;-1;0;0", "0;2;10;-8;10;2;0");
        if (id == 16) return Profile("Suspicious Scan", "5.4", "0;3;18;18;8;8;0", "0;-8;-65;-65;-32;-32;0", "0;0;8;8;0;0;0", "0;0;0;0;-6;-6;0", "0;0;-4;-4;3;3;0", "0;0;1;1;0;0;0", "0;0;-6;-6;6;6;0");
        if (id == 17) return Profile("Furious Stomp", "4.8", "0;-3;-9;-12;-9;-3;0", "0;3;9;12;9;3;0", "0;-3;-12;5;0;0;0", "0;0;2;-2;0;0;0", "0;-1;-2;2;0;0;0", "0;0;-2;3;1;0;0", "0;2;6;-14;9;1;0");
        if (id == 18) return Profile("Victory Pump", "4.8", "0;6;32;20;32;6;0", "0;-20;-105;-65;-105;-20;0", "0;3;-16;-5;-18;0;0", "0;-2;8;0;10;0;0", "0;2;-5;-1;-5;0;0", "0;3;-14;1;-16;1;0", "0;4;-22;22;-18;3;0");
        if (id == 19) return Profile("Dream Drift", "10", "0;2;10;12;8;2;0", "0;-4;-18;-30;-38;-8;0", "0;0;2;3;2;0;0", "0;0;-1;-2;-3;0;0", "0;-2;-4;4;2;0;0", "0;0;-3;-5;-3;0;0", "0;-4;-10;2;12;5;0");
        return Profile("Royal Command", "7.3", "0;2;10;6;6;6;0", "0;-10;-90;-50;-50;-50;0", "0;-2;-7;2;2;0;0", "0;0;2;0;0;0;0", "0;0;-2;-1;-1;-1;0", "0;0;-1;1;0;0;0", "0;0;-5;-8;-8;-8;0");
    }
}
