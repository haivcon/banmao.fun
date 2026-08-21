"use client";

import { useRef, type PointerEvent } from "react";

export function BanmaoBoxProductMark() {
  const markRef = useRef<HTMLDivElement | null>(null);

  const resetParallax = () => {
    const mark = markRef.current;
    if (!mark) return;
    mark.style.setProperty("--mark-rx", "0deg");
    mark.style.setProperty("--mark-ry", "0deg");
    mark.style.setProperty("--mark-glare-x", "50%");
    mark.style.setProperty("--mark-glare-y", "42%");
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    const mark = markRef.current;
    if (!mark) return;
    mark.style.setProperty("--mark-rx", `${(-y * 4).toFixed(2)}deg`);
    mark.style.setProperty("--mark-ry", `${(x * 5).toFixed(2)}deg`);
    mark.style.setProperty("--mark-glare-x", `${50 + x * 18}%`);
    mark.style.setProperty("--mark-glare-y", `${42 + y * 14}%`);
  };

  return (
    <div
      ref={markRef}
      className="box-product-mark"
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
    >
      <span className="box-product-mark__glow" />
      <span className="box-product-mark__glare" />
      <span className="box-product-mark__motion">
        <svg className="box-product-mark__svg" viewBox="0 0 640 640" focusable="false">
        <defs>
          <radialGradient id="box-mark-halo" cx="50%" cy="48%" r="52%">
            <stop offset="0" stopColor="#FFD85A" stopOpacity=".3" />
            <stop offset=".65" stopColor="#FFD85A" stopOpacity=".07" />
            <stop offset="1" stopColor="#FFD85A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="box-mark-lid" x1=".12" y1="0" x2=".88" y2="1">
            <stop stopColor="#FFF0A6" /><stop offset=".48" stopColor="#FFD85A" /><stop offset="1" stopColor="#F5A90B" />
          </linearGradient>
          <linearGradient id="box-mark-body" x1=".18" y1="0" x2=".82" y2="1">
            <stop stopColor="#FFD85A" /><stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <filter id="box-mark-shadow" x="-40%" y="-40%" width="180%" height="200%">
            <feDropShadow dx="0" dy="24" stdDeviation="22" floodColor="#000" floodOpacity=".42" />
          </filter>
          <filter id="box-mark-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <circle cx="320" cy="320" r="292" fill="url(#box-mark-halo)" />
        <g className="box-mark-orbit-lines">
          <circle cx="320" cy="320" r="246" />
          <ellipse cx="320" cy="320" rx="270" ry="170" transform="rotate(-24 320 320)" />
        </g>
        <g className="box-mark-orbit box-mark-orbit--mint">
          <g transform="translate(109 347)"><circle r="35" fill="#62E6C7" /><path d="M-15 0h30M0-15v30" /></g>
        </g>
        <g className="box-mark-orbit box-mark-orbit--violet">
          <g transform="translate(500 174)"><circle r="42" fill="#A78BFA" /><path d="m0-23 20 23L0 23-20 0z" fill="none" /></g>
        </g>
        <g className="box-mark-orbit box-mark-orbit--blue">
          <g transform="translate(526 431)"><circle r="31" fill="#67D4FF" /><path d="M-12 0h24" /></g>
        </g>

        <g className="box-mark-particles" fill="#FFE890">
          <circle cx="157" cy="191" r="6" /><circle cx="478" cy="318" r="5" /><circle cx="177" cy="470" r="4" />
        </g>

        <g className="box-mark-vault" filter="url(#box-mark-shadow)">
          <ellipse className="box-mark-vault__light" cx="320" cy="291" rx="114" ry="37" fill="#FFF2A8" filter="url(#box-mark-soft-glow)" />
          <path d="M184 289 320 229l136 60-14 202-122 64-122-64z" fill="url(#box-mark-body)" stroke="#FFF0B1" strokeWidth="8" strokeLinejoin="round" />
          <g className="box-mark-vault__lid">
            <path d="m184 289 136 65 136-65-136-65z" fill="url(#box-mark-lid)" stroke="#FFF6CE" strokeWidth="8" strokeLinejoin="round" />
            <path d="m227 250 18-91 75 64zm186 0-18-91-75 64z" fill="#FFD85A" stroke="#FFF0B1" strokeWidth="8" strokeLinejoin="round" />
            <path d="m249 208 9-28 26 25zm107-3 26-25 9 28z" fill="#E7830A" opacity=".88" />
          </g>
          <path d="M320 354v198" stroke="#B85308" strokeOpacity=".66" strokeWidth="20" />
          <path d="M184 289 320 354l136-65" fill="none" stroke="#FFF6CE" strokeWidth="8" strokeLinejoin="round" />
          <g className="box-mark-lock">
            <circle cx="320" cy="408" r="55" fill="#0B0E15" stroke="#FFF0B1" strokeWidth="8" />
            <circle className="box-mark-lock__dial" cx="320" cy="398" r="28" fill="none" stroke="#FFD85A" strokeWidth="6" />
            <g className="box-mark-lock__hands">
              <path d="M320 398v-16m0 16 15 10" fill="none" stroke="#FFD85A" strokeWidth="6" strokeLinecap="round" />
            </g>
            <path d="M311 426h18l9 31h-36z" fill="#FFD85A" />
          </g>
        </g>
        </svg>
      </span>
    </div>
  );
}
