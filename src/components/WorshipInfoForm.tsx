
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
    const [formData, setFormData] = useState({
        prayer: '',
        prayer_role: '형제',
        sermon_title: '',
        sermon_text: '',
        preacher: '',
        coupon_recipient_count: 0,
        coupons_per_person: 0
    });

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
            setFormData({
                prayer: logData.prayer || '',
                prayer_role: logData.prayer_role || '형제',
                sermon_title: logData.sermon_title || '',
                sermon_text: logData.sermon_text || '',
                preacher: logData.preacher || '',
                coupon_recipient_count: logData.coupon_recipient_count || 0,
                coupons_per_person: logData.coupons_per_person || 0
            });
        } else {
            setFormData({
                prayer: '',
                prayer_role: '형제',
                sermon_title: '',
                sermon_text: '',
                preacher: '',
                coupon_recipient_count: 0,
                coupons_per_person: 0
            });
        }
    }, [logData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            if (logData?.id) {
                const { error } = await supabase
                    .from('worship_logs')
                    .update(formData)
                    .eq('id', logData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('worship_logs')
                    .insert([{ date: selectedDate, ...formData }]);
                if (error) throw error;
            }
            onUpdate();
            alert('저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const totalCouponAmount = formData.coupon_recipient_count * formData.coupons_per_person * 1000;

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
                        <SmartInput
                            value={formData.prayer}
                            onChange={(val) => setFormData(prev => ({ ...prev, prayer: val }))}
                            options={personOptions}
                            placeholder="이름 검색"
                            className="flex-1"
                        />
                        <select
                            value={formData.prayer_role}
                            onChange={(e) => setFormData(prev => ({ ...prev, prayer_role: e.target.value }))}
                            className="border rounded p-2 text-black w-24"
                        >
                            {PRAYER_ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Preacher Section */}
                <div>
                    <label className="block text-sm font-bold text-gray-900">설교자</label>
                    <SmartInput
                        value={formData.preacher}
                        onChange={(val) => setFormData(prev => ({ ...prev, preacher: val }))}
                        options={['임희준 목사님', '김현민 전도사님']} // Default list logic
                        placeholder="직접 입력 또는 선택"
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-900">말씀 제목</label>
                    <input
                        type="text"
                        value={formData.sermon_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, sermon_title: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">본문</label>
                    <input
                        type="text"
                        value={formData.sermon_text}
                        onChange={(e) => setFormData(prev => ({ ...prev, sermon_text: e.target.value }))}
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
