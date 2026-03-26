
import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

interface AdminWallet {
    address: string;
    name: string | null;
    added_at: number;
}

interface AdminsTabProps {
    t: any;
    adminList: AdminWallet[];
    fetchDashboardData: () => void;
    setError: (err: string | null) => void;
    setSuccess: (msg: string | null) => void;
}

export default function AdminsTab({ t, adminList, fetchDashboardData, setError, setSuccess }: AdminsTabProps) {
    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const [newAdminInput, setNewAdminInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addNewAdmin = async () => {
        if (!newAdminInput || !address) return;
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const message = JSON.stringify({ action: 'admin_action', timestamp: Date.now(), address });
            const signature = await signMessageAsync({ message } as any);
            const res = await fetch('/api/admin/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, message, signature, action: 'add', targetAddress: newAdminInput })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Added admin: ${newAdminInput}`);
                setNewAdminInput('');
                fetchDashboardData();
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeAdmin = async (targetAddress: string) => {
        if (!address) return;
        if (!confirm(`Remove admin ${targetAddress.slice(0, 10)}...?`)) return;
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const message = JSON.stringify({ action: 'admin_action', timestamp: Date.now(), address });
            const signature = await signMessageAsync({ message } as any);
            const res = await fetch('/api/admin/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, message, signature, action: 'remove', targetAddress })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Removed admin: ${targetAddress}`);
                fetchDashboardData();
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">👥 {t.admins.title}</h2>
            <p className="admin-panel-desc">{t.admins.desc}</p>

            <div className="admin-section-card">
                <div className="admin-section-header">
                    <span className="admin-stat-icon">➕</span>
                    <h3 className="admin-section-title">{t.admins.addTitle}</h3>
                </div>

                <div className="admin-form-group">
                    <label>{t.admins.walletAddress}</label>
                    <div className="admin-input-row">
                        <input
                            type="text"
                            value={newAdminInput}
                            onChange={e => setNewAdminInput(e.target.value)}
                            placeholder="0x..."
                        />
                        <button
                            className="admin-btn-primary"
                            onClick={addNewAdmin}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t.processing : t.admins.addBtn}
                        </button>
                    </div>
                </div>
            </div>

            <h3 style={{ color: '#fff', marginTop: '30px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🛡️</span> {t.admins.currentTitle} ({adminList.length})
            </h3>

            <div className="admin-table-container">
                {adminList.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                        {t.admins.noAdmins}
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Address</th>
                                <th>Added Date</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminList.map((admin) => (
                                <tr key={admin.address}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className="admin-address" style={{ color: '#fff', fontFamily: 'monospace' }}>
                                                {admin.address.slice(0, 10)}...{admin.address.slice(-8)}
                                            </span>
                                            {admin.name && <span className="admin-name" style={{ fontSize: '12px', color: '#94a3b8' }}>{admin.name}</span>}
                                        </div>
                                    </td>
                                    <td className="admin-date" style={{ color: '#94a3b8' }}>
                                        {new Date(admin.added_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="admin-btn-danger-outline"
                                            onClick={() => removeAdmin(admin.address)}
                                            disabled={admin.address.toLowerCase() === address?.toLowerCase() || isSubmitting}
                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                        >
                                            {admin.address.toLowerCase() === address?.toLowerCase() ? '(You)' : t.admins.removeBtn}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="admin-info-box" style={{ marginTop: '20px' }}>
                <h4>ℹ️ {t.admins.aboutTitle}</h4>
                <p>{t.admins.aboutDesc}</p>
            </div>
        </div>
    );
}
