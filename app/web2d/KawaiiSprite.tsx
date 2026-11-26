"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

const SPRITES = {
    hero_eastwest: { size: 640, frames: 8, frameMs: 140, holdMs: 640 },
    hero_eastwest_1: { size: 432, frames: 8, frameMs: 140, holdMs: 640 },
    buddy_greet: { size: 160, frames: 6, frameMs: 125, holdMs: 850 },
    mini_gamefi: { size: 288, frames: 6, frameMs: 110, holdMs: 560 },
    mini_defi: { size: 288, frames: 6, frameMs: 135, holdMs: 670 },
    mini_collection: { size: 288, frames: 6, frameMs: 120, holdMs: 610 },
    spirit_humor: { size: 224, frames: 6, frameMs: 125, holdMs: 760 },
    spirit_unity: { size: 224, frames: 6, frameMs: 145, holdMs: 880 },
    spirit_create: { size: 224, frames: 6, frameMs: 155, holdMs: 920 },
    sleepy_footer: { size: 192, frames: 4, frameMs: 270, holdMs: 1500 },
} as const;

export type SpriteName = keyof typeof SPRITES;

type SpriteProps = {
    name: SpriteName;
    mobileName?: SpriteName;
    enabled?: boolean;
    eager?: boolean;
    className?: string;
};

const SPRITE_ROOT = "/web2d/sprites";
const MOBILE_VIEW = "(max-width: 640px)";

function SpriteCanvas({
    name,
    mobileName,
    playing,
    poster,
}: Pick<SpriteProps, "name" | "mobileName"> & { playing: boolean; poster: ReactNode }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!playing) return;

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        const mobileView = mobileName ? window.matchMedia(MOBILE_VIEW) : undefined;
        let request = 0;
        let generation = 0;

        function loadSheet() {
            const selected = mobileName && mobileView?.matches ? mobileName : name;
            const { size, frames, frameMs, holdMs } = SPRITES[selected];
            const current = ++generation;
            const sheet = new window.Image();
            sheet.src = `${SPRITE_ROOT}/${selected}-frames.webp`;

            void sheet.decode().then(() => {
                if (current !== generation || sheet.naturalWidth !== size || sheet.naturalHeight !== size * frames) return;

                cancelAnimationFrame(request);
                canvas.width = size;
                canvas.height = size;

                const draw = (index: number) => {
                    context.clearRect(0, 0, size, size);
                    // Sample a complete cell and redraw it at the same destination.
                    context.drawImage(sheet, 0, index * size, size, size, 0, 0, size, size);
                };

                const cycleMs = frames * frameMs + holdMs;
                let start: number | undefined;
                let previous = 0;
                function tick(now: number) {
                    start ??= now;
                    const elapsed = (now - start) % cycleMs;
                    const index = Math.min(frames - 1, Math.floor(elapsed / frameMs));
                    if (index !== previous) {
                        draw(index);
                        previous = index;
                    }
                    request = requestAnimationFrame(tick);
                }

                draw(0);
                setReady(true);
                request = requestAnimationFrame(tick);
            }, () => {
                // An unavailable sheet leaves the already rendered poster or canvas in place.
            });
        }

        loadSheet();
        mobileView?.addEventListener("change", loadSheet);
        return () => {
            generation++;
            cancelAnimationFrame(request);
            mobileView?.removeEventListener("change", loadSheet);
        };
    }, [name, mobileName, playing]);

    const showCanvas = playing && ready;

    return (
        <>
            {!showCanvas && poster}
            <canvas
                className="web2d-sprite__canvas"
                data-ready={showCanvas}
                style={showCanvas ? undefined : { display: "none" }}
                ref={canvasRef}
            />
        </>
    );
}

export function KawaiiSprite({
    name,
    mobileName,
    enabled = true,
    eager = false,
    className,
}: SpriteProps) {
    const spriteRef = useRef<HTMLSpanElement>(null);
    const [inView, setInView] = useState(false);
    const { size } = SPRITES[name];

    useEffect(() => {
        if (!enabled || !spriteRef.current) return;

        const observer = new IntersectionObserver(([entry]) => {
            setInView((entry?.intersectionRatio ?? 0) >= 0.15);
        }, { threshold: 0.15 });

        observer.observe(spriteRef.current);
        return () => observer.disconnect();
    }, [enabled]);

    return (
        <span className={`web2d-sprite ${className ?? ""}`} ref={spriteRef} aria-hidden="true">
            <SpriteCanvas
                key={name}
                name={name}
                mobileName={mobileName}
                playing={enabled && inView}
                poster={
                    <picture className="web2d-sprite__poster">
                        {mobileName && <source media={MOBILE_VIEW} srcSet={`${SPRITE_ROOT}/${mobileName}-still.webp`} />}
                        <Image
                            src={`${SPRITE_ROOT}/${name}-still.webp`}
                            alt=""
                            width={size}
                            height={size}
                            unoptimized
                            loading={eager && enabled ? "eager" : "lazy"}
                            fetchPriority={eager && enabled ? "high" : undefined}
                            draggable={false}
                        />
                    </picture>
                }
            />
        </span>
    );
}
