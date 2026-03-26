'use client';
import React, { useState, memo } from 'react';

interface ScheduledPostFormProps {
    t: Record<string, string>;
    address?: string;
    onSchedule?: (data: { scheduleTime: string; caption: string; mediaUrl: string }) => void;
}

const ScheduledPostForm = memo(function ScheduledPostForm({ t, address, onSchedule }: ScheduledPostFormProps) {
    const [scheduleTime, setScheduleTime] = useState('');
    const [caption, setCaption] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Min = now + 5 minutes
    const minTime = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

    const handleSubmit = async () => {
        if (!scheduleTime || !address) return;
        setSubmitting(true);
        try {
            onSchedule?.({ scheduleTime, caption, mediaUrl: '' });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            setScheduleTime('');
            setCaption('');
        } catch { } finally {
            setSubmitting(false);
        }
    };

    if (!address) return null;

    return (
        <div className="schedule-card">
            <h3 className="schedule-title">⏰ {t.schedulePost || 'Schedule a Post'}</h3>
            <p className="schedule-desc">{t.scheduleDesc || 'Plan your content ahead of time'}</p>

            <div className="schedule-field">
                <label className="schedule-label">{t.when || 'When'}</label>
                <input
                    type="datetime-local"
                    className="schedule-input"
                    value={scheduleTime}
                    min={minTime}
                    onChange={e => setScheduleTime(e.target.value)}
                />
            </div>

            <div className="schedule-field">
                <label className="schedule-label">{t.caption || 'Caption'}</label>
                <textarea
                    className="schedule-textarea"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={t.writeCaption || 'Write your caption...'}
                    rows={3}
                />
            </div>

            <button
                className="schedule-btn"
                onClick={handleSubmit}
                disabled={!scheduleTime || submitting}
            >
                {success
                    ? `✅ ${t.scheduled || 'Scheduled!'}`
                    : submitting
                        ? '⏳...'
                        : `⏰ ${t.scheduleNow || 'Schedule Post'}`
                }
            </button>

            {success && (
                <div className="schedule-success">
                    ✅ {t.postScheduled || 'Post scheduled for'} {new Date(scheduleTime).toLocaleString()}
                </div>
            )}
        </div>
    );
});

export default ScheduledPostForm;
