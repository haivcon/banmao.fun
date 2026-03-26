import React from 'react';
import { SlotsTranslations } from '../lib/i18n/types';
import { PoolData } from '../hooks/useSlotsGame';
import { InteractiveText } from './InteractiveText';

interface StatusDashboardProps {
    pool: PoolData;
    poolBalance: string;
    formatTokenAmount: (amount: bigint) => string;
    t: SlotsTranslations;
    style: any;
    minBetValue: number;
    effectiveMax: number;
}

const StatusDashboard: React.FC<StatusDashboardProps> = ({
    pool, poolBalance, formatTokenAmount, t, style, minBetValue, effectiveMax
}) => {
    return (
        <div style={{ marginBottom: 10 }}>
            {/* Pool Name & Tier Badge */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10
            }}>
                <InteractiveText style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 16,
                    fontWeight: 700,
                    color: style.primary,
                    textTransform: 'uppercase',
                    textShadow: `0 0 15px ${style.glow}`,
                }}>
                    {pool.name}
                </InteractiveText>
            </div>

            {/* Dashboard Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 1.4fr minmax(0, 1fr)',
                gap: 8,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 99, // More rounded (pill)
                padding: '10px 14px',
                border: `1px solid ${style.primary}20`,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)'
            }}>
                {/* Pool Balance */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <InteractiveText style={{ fontSize: 9, color: 'rgba(200,180,255,0.5)', marginBottom: 2 }}>{t.pool || 'POOL'}</InteractiveText>
                    <InteractiveText style={{
                        fontSize: 11,
                        color: style.primary,
                        fontWeight: 700,
                        fontFamily: "'Space Mono', monospace"
                    }}>
                        {poolBalance}
                    </InteractiveText>
                </div>

                {/* Jackpot (Centerpiece) */}
                <div style={{
                    background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
                    borderRadius: 99,
                    padding: '6px 4px',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px rgba(255, 215, 0, 0.1)'
                }}>
                    <InteractiveText style={{
                        fontSize: 9,
                        color: '#ffd700',
                        fontWeight: 700,
                        letterSpacing: 1,
                        marginBottom: 2,
                        textTransform: 'uppercase'
                    }}>
                        🏆 {t.jackpot || 'JACKPOT'}
                    </InteractiveText>
                    <InteractiveText style={{
                        fontSize: 13,
                        color: '#ffd700',
                        fontWeight: 800,
                        textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
                        fontFamily: "'Space Mono', monospace"
                    }}>
                        {formatTokenAmount(pool.jackpot)}
                    </InteractiveText>
                </div>

                {/* Bet Range */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <InteractiveText style={{ fontSize: 9, color: 'rgba(200,180,255,0.5)', marginBottom: 2 }}>{t.betLabelShort || 'BET'}</InteractiveText>
                    <InteractiveText style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.9)',
                        fontFamily: "monospace"
                    }}>
                        {minBetValue.toFixed(0)} - {effectiveMax.toFixed(0)}
                    </InteractiveText>
                </div>
            </div>
        </div>
    );
};

export default StatusDashboard;
