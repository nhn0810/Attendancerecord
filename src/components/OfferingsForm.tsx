'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Offering } from '@/types/database';

interface OfferingsFormProps {
    logId: string | null;
}

const OFFERING_TYPES = ['주일헌금', '십일조', '감사헌금', '기타'];

export default function OfferingsForm({ logId }: OfferingsFormProps) {
    const [offerings, setOfferings] = useState<Offering[]>([]);

    useEffect(() => {
        if (logId) loadOfferings();
        else setOfferings([]);
    }, [logId]);

    const loadOfferings = async () => {
        if (!logId) return;
        const { data } = await supabase.from('offerings').select('*').eq('log_id', logId);
        setOfferings(data || []);
    };

    const handleUpdate = async (type: string, field: 'amount' | 'memo', value: string) => {
        if (!logId) {
            alert('예배 정보를 먼저 저장해주세요.');
            return;
        }

        // Find existing or create placeholder
        const existing = offerings.find(o => o.type === type);
        let currentAmount = existing?.amount || 0;
        let currentMemo = existing?.memo || '';

        // Update value
        if (field === 'amount') {
            // Remove commas and parse
            const num = Number(value.replace(/,/g, ''));
            if (isNaN(num)) return;
            currentAmount = num;
        } else {
            currentMemo = value;
        }

        const payload = {
            log_id: logId,
            type,
            amount: currentAmount,
            memo: currentMemo
        };

        // Optimistic Update
        const newOfferings = [...offerings];
        const index = newOfferings.findIndex(o => o.type === type);
        if (index >= 0) {
            newOfferings[index] = { ...newOfferings[index], ...payload } as Offering;
        } else {
            newOfferings.push({ ...payload, id: 'temp' } as Offering);
        }
        setOfferings(newOfferings);

        // Server Update
        try {
            if (existing?.id && existing.id !== 'temp') {
                await supabase.from('offerings').update(payload).eq('id', existing.id);
            } else {
                // Upsert logic simulation
                const { data: found } = await supabase.from('offerings').select('id').eq('log_id', logId).eq('type', type).single();

                if (found) {
                    await supabase.from('offerings').update(payload).eq('id', found.id);
                } else {
                    await supabase.from('offerings').insert([payload]);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getOffering = (type: string) => offerings.find(o => o.type === type) || { amount: 0, memo: '' };

    const totalAmount = offerings.reduce((sum, o) => sum + (o.amount || 0), 0);

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4 text-black">3. 헌금 기록</h2>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">항목</th>
                            <th className="px-6 py-3">금액</th>
                            <th className="px-6 py-3">명단 / 메모</th>
                        </tr>
                    </thead>
                    <tbody>
                        {OFFERING_TYPES.map(type => {
                            const item = getOffering(type);
                            return (
                                <tr key={type} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{type}</td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={item.amount ? item.amount.toLocaleString() : ''}
                                            onChange={e => handleUpdate(type, 'amount', e.target.value)}
                                            className="border rounded p-2 w-32 text-right text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        {type === '주일헌금' ? (
                                            <input
                                                type="text"
                                                disabled
                                                className="border rounded p-2 w-full bg-gray-100 text-gray-400 cursor-not-allowed"
                                                value="-"
                                                title="주일헌금은 명단을 입력하지 않습니다."
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={item.memo || ''}
                                                onChange={e => handleUpdate(type, 'memo', e.target.value)}
                                                className="border rounded p-2 w-full text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="이름 입력 (쉼표로 구분)"
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                            <td className="px-6 py-4 text-gray-800">합계</td>
                            <td className="px-6 py-4 text-right pr-32 text-indigo-700 text-lg" colSpan={2}>
                                {totalAmount.toLocaleString()} 원
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
