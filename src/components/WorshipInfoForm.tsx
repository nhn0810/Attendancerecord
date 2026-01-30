'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { WorshipLog } from '@/types/database';
import SmartInput from './ui/SmartInput';

interface WorshipInfoFormProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    logData: WorshipLog | null;
    onUpdate: () => void;
}

const PRAYER_ROLES = ['형제', '자매', '회장', '부회장', '서기', '회계', '목사님', '선생님', '직접입력'];

export default function WorshipInfoForm({ selectedDate, onDateChange, logData, onUpdate }: WorshipInfoFormProps) {
    const [loading, setLoading] = useState(false);
    const [personOptions, setPersonOptions] = useState<string[]>([]);

    // State Variables
    const [preacher, setPreacher] = useState('');
    const [prayer, setPrayer] = useState('');
    const [prayerRole, setPrayerRole] = useState('형제');
    const [customRole, setCustomRole] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const PREDEFINED_ROLES = ['형제', '자매', '회장', '부회장', '서기', '회계', '목사님', '선생님'];

    // Fetch Names for Autocomplete
    useEffect(() => {
        (async () => {
            const [sRes, tRes] = await Promise.all([
                supabase.from('students').select('name').eq('is_active', true),
                supabase.from('teachers').select('name').eq('is_active', true)
            ]);
            const names = new Set([
                ...(sRes.data?.map(s => s.name) || []),
                ...(tRes.data?.map(t => t.name) || [])
            ]);
            setPersonOptions(Array.from(names).sort());
        })();
    }, []);

    useEffect(() => {
        if (logData) {
            setPreacher(logData.preacher || '');
            setPrayer(logData.prayer || '');
            setTitle(logData.sermon_title || '');
            setContent(logData.sermon_text || '');

            // Handle Role
            if (logData.prayer_role) {
                if (PREDEFINED_ROLES.includes(logData.prayer_role)) {
                    setPrayerRole(logData.prayer_role);
                    setCustomRole('');
                } else {
                    setPrayerRole('직접입력');
                    setCustomRole(logData.prayer_role);
                }
            } else {
                setPrayerRole('형제');
                setCustomRole('');
            }
        } else {
            setPreacher('');
            setPrayer('');
            setPrayerRole('형제');
            setCustomRole('');
            setTitle('');
            setContent('');
        }
    }, [logData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            if (!selectedDate) return alert('날짜를 선택해주세요.');

            const finalRole = prayerRole === '직접입력' ? customRole : prayerRole;
            if (!finalRole.trim()) return alert('기도자 직책을 입력해주세요.');

            const logEntry = {
                date: selectedDate,
                preacher: preacher,
                prayer: prayer,
                prayer_role: finalRole,
                sermon_title: title,
                sermon_text: content,
                coupon_recipient_count: logData?.coupon_recipient_count || 0, // Preserve existing coupon data if any
                coupons_per_person: logData?.coupons_per_person || 0, // Preserve existing coupon data if any
            };

            if (logData?.id) {
                const { error } = await supabase
                    .from('worship_logs')
                    .update(logEntry)
                    .eq('id', logData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('worship_logs')
                    .insert([logEntry]);
                if (error) throw error;
            }
            onUpdate();
            alert('저장되었습니다.');
        } catch (e: any) {
            console.error(e);
            alert('저장 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">1. 예배 정보 입력</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-bold text-gray-900">날짜</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Prayer Section */}
                <div>
                    <label className="block text-sm font-bold text-gray-900">기도자</label>
                    <div className="flex gap-2">
                        <div className="flex-none">
                            <select
                                value={prayerRole}
                                onChange={(e) => setPrayerRole(e.target.value)}
                                className="w-24 border rounded p-2 text-black bg-white"
                            >
                                {PREDEFINED_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                <option value="직접입력">직접입력</option>
                            </select>
                        </div>
                        {prayerRole === '직접입력' && (
                            <input
                                type="text"
                                value={customRole}
                                onChange={(e) => setCustomRole(e.target.value)}
                                placeholder="직책 입력"
                                className="w-24 border rounded p-2 text-black"
                            />
                        )}
                        <div className="flex-1">
                            <SmartInput
                                value={prayer}
                                onChange={setPrayer}
                                options={personOptions}
                                placeholder="이름 검색"
                            />
                        </div>
                    </div>
                </div>

                {/* Preacher Section */}
                <div>
                    <label className="block text-sm font-bold text-gray-900">설교자</label>
                    <SmartInput
                        value={preacher}
                        onChange={setPreacher}
                        options={['임희준 목사님']}
                        placeholder="직접 입력 또는 선택"
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900">말씀 제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">본문</label>
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
                        placeholder="예: 요한복음 3장 16절"
                    />
                </div>
            </div>

            <div className="mt-4 text-right">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? '저장 중...' : '저장하기'}
                </button>
            </div>
        </div>
    );
}
