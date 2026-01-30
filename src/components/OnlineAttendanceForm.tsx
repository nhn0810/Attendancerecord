'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';

interface OnlineAttendanceFormProps {
    logId: string | null;
    selectedDate: string;
    onUpdate: () => void;
}

export default function OnlineAttendanceForm({ logId, selectedDate, onUpdate }: OnlineAttendanceFormProps) {
    const [count, setCount] = useState<number>(0);
    const [names, setNames] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Fetch data
    const fetchOnlineData = useCallback(async () => {
        if (!logId) {
            setCount(0);
            setNames('');
            return;
        }
        const { data } = await supabase.from('worship_logs').select('online_attendance_count, online_attendance_names').eq('id', logId).single();
        if (data) {
            setCount(data.online_attendance_count || 0);
            setNames(data.online_attendance_names || '');
        }
    }, [logId]);

    useEffect(() => {
        fetchOnlineData();
    }, [fetchOnlineData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                online_attendance_count: count,
                online_attendance_names: names
            };

            if (logId) {
                await supabase.from('worship_logs').update(payload).eq('id', logId);
            } else {
                // If log doesn't exist, create it (rare case if parent handles it)
                await supabase.from('worship_logs').insert([{ date: selectedDate, ...payload }]);
            }
            alert('온라인 출석이 저장되었습니다.');
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-black">
                🖥️ 온라인 출석
            </h2>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center gap-2">
                    <label className="font-bold text-black">인원수:</label>
                    <input
                        type="number"
                        min="0"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="border p-2 rounded w-24 text-right text-lg font-bold text-indigo-700"
                    />
                    <span className="text-gray-900">명</span>
                </div>

                <div className="flex-1 w-full">
                    <label className="font-bold text-black block mb-1">명단 (메모용):</label>
                    <input
                        type="text"
                        value={names}
                        onChange={(e) => setNames(e.target.value)}
                        placeholder="예: 김철수, 이영희 (이미지에는 출력되지 않음)"
                        className="border p-2 rounded w-full text-black"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 whitespace-nowrap self-end md:self-auto"
                >
                    저장
                </button>
            </div>
        </div>
    );
}
