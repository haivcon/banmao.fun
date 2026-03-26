// ===== PARTICLES COMPONENT =====
// Visual particle effects for item collection

import React from 'react';

export interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
}

interface ParticlesProps {
    particles: Particle[];
}

/**
 * Particles component for visual effects when collecting items
 */
export function Particles({ particles }: ParticlesProps) {
    return (
        <>
            {particles.map(p => (
                <div
                    key={p.id}
                    className="particle"
                    style={{
                        left: p.x + p.vx * 10,
                        top: p.y + p.vy * 10,
                        background: p.color,
                        boxShadow: `0 0 6px ${p.color}`
                    }}
                />
            ))}
        </>
    );
}

export default Particles;
