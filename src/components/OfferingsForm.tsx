
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
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (logId) loadOfferings();
        else setOfferings([]);
    }, [logId]);

    const loadOfferings = async () => {
        if (!logId) return;
        const { data } = await supabase.from('offerings').select('*').eq('log_id', logId);
        setOfferings(data || []);
    };

    const handleUpdate = async (type: string, field: 'amount' | 'memo', value: string | number) => {
        if (!logId) {
            alert('예배 정보를 먼저 저장해주세요.');
            return;
        }

        // Find existing offering of this type or create placeholder
        const existing = offerings.find(o => o.type === type);

        // Prepare object
        const payload: Partial<Offering> = {
            log_id: logId,
            type,
            amount: existing?.amount || 0,
            memo: existing?.memo || ''
        };

        // Update local state value
        if (field === 'amount') payload.amount = Number(value);
        if (field === 'memo') payload.memo = String(value);

        // Optimistic Update
        const newOfferings = [...offerings];
        const index = newOfferings.findIndex(o => o.type === type);
        if (index >= 0) {
            newOfferings[index] = { ...newOfferings[index], ...payload } as Offering;
        } else {
            // It's a new entry visually, but we need ID from server really. 
            // For simplicity, we just trigger upsert via API call and reload or handle logic carefully.
            // But upsert needs ID to update. Since we don't have ID yet for "new" types on client...
            // We will search by (log_id, type) but our schema uses UUID PK.
            // We should probably Query -> Update/Insert. Use upsert logic if we had a unique constraint on (log_id, type).
            // Our schema didn't enforce unique (log_id, type) strictly in SQL? Let's check init.sql.
            // `create table public.offerings ...` No unique constraint on type.
            // We should probably treat it as "Find one by type".
            newOfferings.push({ ...payload, id: 'temp' } as Offering);
        }
        setOfferings(newOfferings);

        // Server Update (Debouncing would be good here in real world, but for now direct)
        // We will Delete old for this type and Insert new to avoid duplicates or complex ID tracking for MVP
        // OR smarter: check if we have an ID.

        try {
            if (existing?.id) {
                await supabase.from('offerings').update(payload).eq('id', existing.id);
            } else {
                // Insert and reload to get ID
                const { data } = await supabase.from('offerings').insert([payload]).select();
                if (data) {
                    // Update the temp one with real one
                    loadOfferings();
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
                                <tr key={type} className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">{type}</td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            value={item.amount || ''}
                                            onChange={e => handleUpdate(type, 'amount', e.target.value)}
                                            className="border rounded p-1 w-32 text-right text-black"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={item.memo || ''}
                                            onChange={e => handleUpdate(type, 'memo', e.target.value)}
                                            className="border rounded p-1 w-full text-black"
                                            placeholder="이름 입력 (쉼표로 구분)"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="bg-gray-100 font-bold">
                            <td className="px-6 py-4">합계</td>
                            <td className="px-6 py-4 text-right pr-32" colSpan={2}>
                                {totalAmount.toLocaleString()} 원
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
