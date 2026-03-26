/**
 * StakeInput Component
 * Input field with +/- step controls for stake, room ID, salt, etc.
 */

"use client";

import React, { useCallback, useMemo } from "react";

export type StepInputMode = "decimal" | "numeric" | "text";

export interface StakeInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    onStep?: (delta: number | bigint) => void;
    label: string;
    placeholder?: string;
    step?: number | bigint;
    stepLabel?: string;
    inputMode?: StepInputMode;
    disabled?: boolean;
    className?: string;
    hint?: string;
    min?: number;
    max?: number;
    ariaDescribedBy?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
    showStepOptions?: boolean;
    stepOptions?: { value: number; label: string }[];
    activeStepOption?: number;
    onStepOptionChange?: (value: number) => void;
}

export default function StakeInput({
    id,
    value,
    onChange,
    onStep,
    label,
    placeholder,
    step = 1,
    stepLabel,
    inputMode = "decimal",
    disabled = false,
    className = "",
    hint,
    min,
    max,
    ariaDescribedBy,
    inputRef,
    showStepOptions = false,
    stepOptions = [],
    activeStepOption,
    onStepOptionChange,
}: StakeInputProps) {
    const handleDecrease = useCallback(() => {
        if (onStep) {
            onStep(typeof step === "bigint" ? -step : -Number(step));
        }
    }, [onStep, step]);

    const handleIncrease = useCallback(() => {
        if (onStep) {
            onStep(step);
        }
    }, [onStep, step]);

    const inputType = inputMode === "numeric" ? "number" : "text";

    return (
        <div className={`stake-input ${className}`}>
            <label className="stake-input__label" htmlFor={id}>
                {label}
            </label>
            <div className="commit-window-control commit-window-control--wide">
                <button
                    type="button"
                    className="commit-window-control__step"
                    aria-label={`Decrease ${label} by ${stepLabel || step}`}
                    onClick={handleDecrease}
                    disabled={disabled}
                >
                    −
                </button>
                <input
                    id={id}
                    ref={inputRef}
                    className="stake-section__input commit-window-control__input"
                    type={inputType}
                    inputMode={inputMode}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || label}
                    disabled={disabled}
                    min={min}
                    max={max}
                    aria-label={label}
                    aria-describedby={ariaDescribedBy}
                />
                <button
                    type="button"
                    className="commit-window-control__step"
                    aria-label={`Increase ${label} by ${stepLabel || step}`}
                    onClick={handleIncrease}
                    disabled={disabled}
                >
                    +
                </button>
            </div>

            {showStepOptions && stepOptions.length > 0 && (
                <div className="commit-window-control__step-options">
                    {stepOptions.map((opt) => {
                        const isActive = activeStepOption === opt.value;
                        return (
                            <button
                                key={`step-${opt.value}`}
                                type="button"
                                className={`commit-window-control__step-option${isActive ? " commit-window-control__step-option--active" : ""
                                    }`}
                                onClick={() => onStepOptionChange?.(opt.value)}
                                aria-pressed={isActive}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {hint && (
                <span id={ariaDescribedBy} className="stake-input__hint">
                    {hint}
                </span>
            )}
        </div>
    );
}
