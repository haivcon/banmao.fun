
import React from 'react';

interface ActivityLog {
    id: number;
    action: string;
    actor: string | null;
    target: string | null;
    details: string | null;
    created_at: number;
}

interface LogsTabProps {
    t: any;
    activityLogs: ActivityLog[];
}

export default function LogsTab({ t, activityLogs }: LogsTabProps) {
    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">📋 {t.logs.title}</h2>
            <p className="admin-panel-desc">{t.logs.desc}</p>

            <div className="admin-table-container">
                {activityLogs.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#666', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                        {t.logs.noLogs}
                    </div>
                ) : (
                    <div className="admin-logs-list">
                        {activityLogs.map((log) => (
                            <div key={log.id} className="admin-log-item" style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '16px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: 'rgba(0,0,0,0.2)',
                                marginBottom: '8px',
                                borderRadius: '8px'
                            }}>
                                <div className="admin-log-icon" style={{
                                    fontSize: '20px',
                                    marginRight: '15px',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '50%'
                                }}>
                                    {log.action === 'config_update' ? '⚙️' :
                                        log.action === 'admin_add' ? '➕' :
                                            log.action === 'admin_remove' ? '➖' : '📝'}
                                </div>
                                <div className="admin-log-content" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                                        <span className="admin-log-action" style={{
                                            color: '#fff',
                                            fontWeight: 600,
                                            textTransform: 'capitalize',
                                            background: 'rgba(34, 211, 238, 0.1)',

                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px'
                                        }}>
                                            {log.action.replace('_', ' ')}
                                        </span>
                                        {log.target && (
                                            <span className="admin-log-target" style={{
                                                color: '#a855f7',
                                                fontFamily: 'monospace',
                                                fontSize: '13px'
                                            }}>
                                                {log.target}
                                            </span>
                                        )}
                                    </div>
                                    <span className="admin-log-time" style={{ color: '#64748b', fontSize: '12px' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="admin-log-actor" style={{
                                    marginLeft: '15px',
                                    textAlign: 'right'
                                }}>
                                    <span style={{ color: '#94a3b8', fontSize: '11px', display: 'block' }}>Actor</span>
                                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px' }}>
                                        {log.actor ? `${log.actor.slice(0, 6)}...` : 'System'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
