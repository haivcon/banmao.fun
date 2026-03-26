"use client";

import React, { useEffect, useState, useRef } from "react";

interface CountUpProps {
    end: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
    end,
    duration = 2000,
    decimals = 0,
    prefix = "",
    suffix = "",
    className = ""
}) => {
    const [count, setCount] = useState(0);
    const countRef = useRef<HTMLSpanElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        if (hasAnimated) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    startAnimation();
                    setHasAnimated(true);
                }
            },
            { threshold: 0.1 }
        );

        if (countRef.current) {
            observerRef.current.observe(countRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasAnimated]);

    const startAnimation = () => {
        let startTime: number | null = null;
        const startValue = 0;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = startValue + (end - startValue) * easeProgress;
            setCount(current);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    };

    const formatNumber = (value: number) => {
        return value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    };

    return (
        <span ref={countRef} className={className}>
            {prefix}{formatNumber(count)}{suffix}
        </span>
    );
};
