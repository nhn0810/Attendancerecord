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
    // Use string for input to handle leading zeros better while typing
    const [recipientCountStr, setRecipientCountStr] = useState('0');
    // Enforce 3 coupons per person
    const [perPerson] = useState(3);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (logData) {
            setRecipientCountStr(String(logData.coupon_recipient_count || 0));
        } else {
            setRecipientCountStr('0');
        }
    }, [logData]);

    const handleRecipientChange = (val: string) => {
        // Remove non-digits
        const numVal = val.replace(/\D/g, '');
        // Remove leading zeros unless it is just "0"
        const cleanVal = numVal.replace(/^0+(?=\d)/, '') || '0';
        setRecipientCountStr(cleanVal);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                coupon_recipient_count: Number(recipientCountStr),
                coupons_per_person: perPerson // Always 3
            };

            if (logData?.id) {
                await supabase.from('worship_logs').update(payload).eq('id', logData.id);
            } else {
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

    const totalAmount = Number(recipientCountStr) * perPerson * 1000;

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">🎁 만나쿠폰 발급내역 (1,000원권)</h2>
            <div className="flex flex-wrap gap-6 items-center bg-gray-50 p-4 rounded border">
                <div className="flex items-center">
                    <label className="text-gray-700 font-bold mr-2">수령 인원:</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={recipientCountStr}
                        onClick={(e) => e.currentTarget.select()}
                        onChange={(e) => handleRecipientChange(e.target.value)}
                        className="border p-2 w-24 rounded text-right text-black text-lg font-medium"
                    />
                    <span className="ml-2 text-black">명</span>
                </div>

                <div className="flex items-center">
                    <label className="text-gray-700 font-bold mr-2">1인당 지급:</label>
                    <input
                        type="number"
                        value={perPerson}
                        readOnly
                        disabled
                        className="border p-2 w-24 rounded text-right bg-gray-200 text-gray-500 cursor-not-allowed font-medium"
                    />
                    <span className="ml-2 text-black">장 (고정)</span>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    <div className="text-lg">
                        총 합계: <span className="font-bold text-indigo-600">{totalAmount.toLocaleString()}</span> 원
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-bold shadow"
                    >
                        저장
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">* '저장' 버튼을 눌러야 반영됩니다.</p>
        </div>
    );
}
