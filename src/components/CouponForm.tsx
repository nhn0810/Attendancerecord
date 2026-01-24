
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { WorshipLog } from '@/types/database';

interface CouponFormProps {
    selectedDate: string;
    logData: WorshipLog | null;
    onUpdate: () => void;
}

export default function CouponForm({ selectedDate, logData, onUpdate }: CouponFormProps) {
    const [recipientCount, setRecipientCount] = useState(0);
    const [perPerson, setPerPerson] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (logData) {
            setRecipientCount(logData.coupon_recipient_count || 0);
            setPerPerson(logData.coupons_per_person || 0);
        } else {
            setRecipientCount(0);
            setPerPerson(0);
        }
    }, [logData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                coupon_recipient_count: recipientCount,
                coupons_per_person: perPerson
            };

            if (logData?.id) {
                await supabase.from('worship_logs').update(payload).eq('id', logData.id);
            } else {
                // Create log if not exists (though usually WorshipInfo creates it first)
                await supabase.from('worship_logs').insert([{ date: selectedDate, ...payload }]);
            }
            onUpdate();
            alert('쿠폰 정보가 저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = recipientCount * perPerson * 1000;

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">🎁 만나쿠폰 발급내역 (1,000원권)</h2>
            <div className="flex flex-wrap gap-6 items-center bg-gray-50 p-4 rounded border">
                <div className="flex items-center">
                    <label className="text-gray-700 font-bold mr-2">수령 인원:</label>
                    <input
                        type="number"
                        min="0"
                        value={recipientCount}
                        onChange={(e) => setRecipientCount(Number(e.target.value))}
                        className="border p-2 w-24 rounded text-right text-black"
                    />
                    <span className="ml-2 text-black">명</span>
                </div>

                <div className="flex items-center">
                    <label className="text-gray-700 font-bold mr-2">1인당 지급:</label>
                    <input
                        type="number"
                        min="0"
                        value={perPerson}
                        onChange={(e) => setPerPerson(Number(e.target.value))}
                        className="border p-2 w-24 rounded text-right text-black"
                    />
                    <span className="ml-2 text-black">장</span>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    <div className="text-lg">
                        총 합계: <span className="font-bold text-indigo-600">{totalAmount.toLocaleString()}</span> 원
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
                    >
                        저장
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">* '저장' 버튼을 눌러야 반영됩니다.</p>
        </div>
    );
}
