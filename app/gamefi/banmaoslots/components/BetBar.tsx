import { slotsSounds } from '../lib/sounds';
import { SlotsTranslations } from '../lib/i18n/types';

interface BetBarProps {
    localBetAmount: string;
    setLocalBetAmount: (val: string) => void;
    minBetValue: number;
    maxBetValue: number;
    walletBalance: number;
    isSpinning: boolean;
    t: SlotsTranslations;
    style: any;
    onSetMin: () => void;
    onSetHalf: () => void;
    onSetDouble: () => void;
    onSetMax: () => void;
}

const BetBar: React.FC<BetBarProps> = ({
    localBetAmount, setLocalBetAmount, minBetValue, maxBetValue, walletBalance, isSpinning, t, style,
    onSetMin, onSetHalf, onSetDouble, onSetMax
}) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            marginBottom: 10,
            background: 'rgba(0,0,0,0.4)',
            padding: '6px 10px',
            borderRadius: 99, // Pill shape
            border: `1px solid ${style.primary}20`,
            backdropFilter: 'blur(10px)'
        }}>
            {/* Input Section */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(10, 5, 25, 0.8)',
                borderRadius: 99,
                border: `1px solid ${style.primary}30`,
                padding: '0 12px',
                height: 38
            }}>
                <span style={{
                    fontSize: 10,
                    color: style.primary,
                    marginRight: 6,
                    fontWeight: 700
                }}>{t.betLabelShort || 'BET'}</span>

                <input
                    type="number"
                    value={localBetAmount}
                    onChange={(e) => setLocalBetAmount(e.target.value)}
                    onFocus={() => slotsSounds.hover()} // Sound on focus
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 14,
                        textAlign: 'right',
                        width: '100%',
                        outline: 'none'
                    }}
                    disabled={isSpinning}
                />
            </div>

            {/* Quick Actions Group */}
            <div style={{ display: 'flex', gap: 3 }}>
                <button
                    onClick={() => { slotsSounds.click(); onSetMin(); }}
                    onMouseEnter={() => slotsSounds.hover()}
                    disabled={isSpinning}
                    className="bet-btn bet-btn-min"
                    style={{
                        width: 38, height: 38, fontSize: 9, fontWeight: 700,
                        background: `${style.primary}15`, border: `1px solid ${style.primary}25`,
                        borderRadius: '50%', color: style.primary, cursor: isSpinning ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isSpinning ? 0.5 : 1,
                    }}
                    title={t.minBet || "Min Bet"}>
                    {t.min || 'MIN'}
                </button>
                <button
                    onClick={() => { slotsSounds.click(); onSetHalf(); }}
                    onMouseEnter={() => slotsSounds.hover()}
                    disabled={isSpinning}
                    className="bet-btn bet-btn-half"
                    style={{
                        width: 38, height: 38, fontSize: 10, fontWeight: 700,
                        background: `${style.primary}15`, border: `1px solid ${style.primary}25`,
                        borderRadius: '50%', color: style.primary, cursor: isSpinning ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isSpinning ? 0.5 : 1,
                    }}
                    title={(t as any).halfBet || "Half Bet"}>
                    ½
                </button>
                <button
                    onClick={() => { slotsSounds.click(); onSetDouble(); }}
                    onMouseEnter={() => slotsSounds.hover()}
                    disabled={isSpinning}
                    className="bet-btn bet-btn-double"
                    style={{
                        width: 38, height: 38, fontSize: 10, fontWeight: 700,
                        background: `${style.primary}15`, border: `1px solid ${style.primary}25`,
                        borderRadius: '50%', color: style.primary, cursor: isSpinning ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isSpinning ? 0.5 : 1,
                    }}
                    title={(t as any).doubleBet || "Double Bet"}>
                    2×
                </button>
                <button
                    onClick={() => { slotsSounds.coin(); onSetMax(); }}
                    onMouseEnter={() => slotsSounds.hover()}
                    disabled={isSpinning}
                    className="bet-btn bet-btn-max"
                    style={{
                        width: 38, height: 38, fontSize: 9, fontWeight: 700,
                        background: `${style.primary}15`, border: `1px solid ${style.primary}25`,
                        borderRadius: '50%', color: style.primary, cursor: isSpinning ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        opacity: isSpinning ? 0.5 : 1,
                    }}
                    title={t.maxBet || "Max Bet"}>
                    {t.max || 'MAX'}
                </button>
            </div>
            <style jsx>{`
                .bet-btn:hover:not(:disabled) {
                    transform: scale(1.15);
                    box-shadow: 0 0 15px ${style.primary}80, inset 0 0 8px ${style.primary}30;
                    background: ${style.primary}35 !important;
                    border-color: ${style.primary}60 !important;
                }
                .bet-btn:active:not(:disabled) {
                    transform: scale(0.95);
                }
            `}</style>
        </div>
    );
};

export default BetBar;
