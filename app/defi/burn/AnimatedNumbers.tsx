import React from "react";

export const AnimatedNumbers = ({ value, duration = 2000, format = (n: number) => n.toLocaleString() }: { value: number; duration?: number; format?: (n: number) => string }) => {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        let startTime: number;
        const startValue = displayValue;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Ease out quart
            const easeProgress = 1 - Math.pow(1 - progress, 4);

            setDisplayValue(startValue + (value - startValue) * easeProgress);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }, [value, duration]);

    return <span>{format(Math.floor(displayValue))}</span>;
};

export default AnimatedNumbers;
