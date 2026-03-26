
import React, { useState } from 'react';
import { SafetyButton } from './SafetyButton';

interface SystemTabProps {
    t: any;
    backendConfig: Record<string, string>;
    saveBackendConfig: (key: string, value: string) => Promise<void>;
}

export default function SystemTab({ t, backendConfig, saveBackendConfig }: SystemTabProps) {
    const [maintenanceMessage, setMaintenanceMessage] = useState('');

    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">⚙️ {t.system.title}</h2>
            <p className="admin-panel-desc">{t.system.desc}</p>

            <div className={`admin-section-card ${backendConfig['MAINTENANCE_MODE'] === 'true' ? 'warning-border' : ''}`}
                style={{ borderColor: backendConfig['MAINTENANCE_MODE'] === 'true' ? '#ef4444' : undefined }}>

                <div className="admin-section-header">
                    <span className="admin-stat-icon" style={{ color: backendConfig['MAINTENANCE_MODE'] === 'true' ? '#ef4444' : '#22d3ee' }}>
                        {backendConfig['MAINTENANCE_MODE'] === 'true' ? '🔴' : '🟢'}
                    </span>
                    <h3 className="admin-section-title">{t.system.maintenance.title}</h3>
                </div>

                <p className="admin-panel-desc" style={{ marginBottom: '20px' }}>
                    {t.system.maintenance.desc}
                </p>

                <div className="admin-form-group">
                    <label>{t.system.maintenance.statusLabel}</label>
                    <div className="admin-toggle-row" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                        <button
                            className={`admin-toggle-btn ${backendConfig['MAINTENANCE_MODE'] !== 'true' ? 'active' : ''}`}
                            onClick={() => saveBackendConfig('MAINTENANCE_MODE', 'false')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: backendConfig['MAINTENANCE_MODE'] !== 'true' ? '#22c55e' : 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity: backendConfig['MAINTENANCE_MODE'] !== 'true' ? 1 : 0.5
                            }}
                        >
                            Active (Online)
                        </button>
                    </div>

                    <div className="admin-kill-switch">
                        <SafetyButton
                            onConfirm={() => saveBackendConfig('MAINTENANCE_MODE', 'true')}
                            label="☢️ ACTIVATE EMERGENCY STOP ☢️"
                            confirmLabel="RELEASE TO KILL SYSTEM"
                            disabled={backendConfig['MAINTENANCE_MODE'] === 'true'}
                            className="kill-btn"
                            duration={3000}
                        />
                        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                            {backendConfig['MAINTENANCE_MODE'] === 'true' ? "SYSTEM IS CURRENTLY OFFLINE" : "HOLD 3 SECONDS TO PAUSE ALL GAMES"}
                        </p>
                    </div>
                </div>

                <div className="admin-form-group">
                    <label>{t.system.maintenance.messageLabel}</label>
                    <div className="admin-input-row">
                        <input
                            type="text"
                            value={maintenanceMessage}
                            onChange={e => setMaintenanceMessage(e.target.value)}
                            placeholder={backendConfig['MAINTENANCE_MESSAGE'] || t.system.maintenance.defaultMessage}
                        />
                        <button className="admin-btn-primary" onClick={() => saveBackendConfig('MAINTENANCE_MESSAGE', maintenanceMessage)}>
                            {t.save}
                        </button>
                    </div>
                    <span className="admin-form-hint">{t.current}: {backendConfig['MAINTENANCE_MESSAGE'] || 'None'}</span>
                </div>
            </div>

            <div className="admin-info-box">
                <h4>⚠️ {t.system.maintenance.warningTitle}</h4>
                <p>{t.system.maintenance.warningDesc}</p>
            </div>
        </div>
    );
}
