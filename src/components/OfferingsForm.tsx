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
        const { data, error } = await supabase.from('offerings').select('*').eq('log_id', logId).order('id', { ascending: true });

        if (error || !data) {
            setOfferings([]);
            return;
        }

        // 중복 데이터 제거 (타이핑 시 다중 INSERT 버그로 인해 발생한 기존의 잉여 데이터 등 정리)
        // 마지막에 입력된 데이터만 유지합니다.
        const dedupedMap = new Map<string, Offering>();
        const toDeleteIds: string[] = [];

        data.forEach(item => {
            if (dedupedMap.has(item.type)) {
                // 이전 레코드의 ID를 삭제 목록에 추가
                toDeleteIds.push(dedupedMap.get(item.type)!.id);
            }
            dedupedMap.set(item.type, item);
        });

        if (toDeleteIds.length > 0) {
            supabase.from('offerings').delete().in('id', toDeleteIds).then(() => console.log('Cleaned up duplicate offerings'));
        }

        setOfferings(Array.from(dedupedMap.values()));
    };

    const handleLocalUpdate = (type: string, field: 'amount' | 'memo', value: string) => {
        if (!logId) {
            if (field === 'amount') alert('예배 정보를 먼저 저장해주세요.');
            return;
        }

        setOfferings(prev => {
            const next = [...prev];
            const index = next.findIndex(o => o.type === type);
            const existing = index >= 0 ? next[index] : { log_id: logId, type, amount: 0, memo: '', id: 'temp' } as Offering;

            if (field === 'amount') {
                if (value === '') {
                    existing.amount = 0;
                } else {
                    const num = Number(value.replace(/,/g, ''));
                    if (!isNaN(num)) existing.amount = num;
                }
            } else {
                existing.memo = value;
            }

            if (index >= 0) {
                next[index] = existing;
            } else {
                next.push(existing);
            }
            return next;
        });
    };

    const handleSave = async (type: string) => {
        if (!logId) return;

        const existing = offerings.find(o => o.type === type);
        if (!existing) return;

        const payload = {
            log_id: logId,
            type,
            amount: existing.amount || 0,
            memo: existing.memo || ''
        };

        try {
            if (existing.id && existing.id !== 'temp') {
                await supabase.from('offerings').update(payload).eq('id', existing.id);
            } else {
                // 혹시 저장하는 사이에 race condition으로 생긴 row가 있는지 확인
                const { data: found } = await supabase.from('offerings').select('id').eq('log_id', logId).eq('type', type);

                if (found && found.length > 0) {
                    await supabase.from('offerings').update(payload).eq('id', found[0].id);
                    setOfferings(prev => prev.map(o => o.type === type ? { ...o, id: found[0].id } : o));

                    if (found.length > 1) {
                        const idsToDelete = found.slice(1).map(f => f.id);
                        await supabase.from('offerings').delete().in('id', idsToDelete);
                    }
                } else {
                    const { data: inserted } = await supabase.from('offerings').insert([payload]).select('id').single();
                    if (inserted) {
                        setOfferings(prev => prev.map(o => o.type === type ? { ...o, id: inserted.id } : o));
                    }
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

            {/* Mobile View: Stacked Forms */}
            <div className="md:hidden space-y-6">
                {OFFERING_TYPES.map(type => {
                    const item = getOffering(type);
                    return (
                        <div key={type} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block font-bold text-gray-900 mb-3 text-lg">{type}</label>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">금액</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={item.amount ? item.amount.toLocaleString() : ''}
                                        onChange={e => handleLocalUpdate(type, 'amount', e.target.value)}
                                        onBlur={() => handleSave(type)}
                                        className="border rounded-lg p-3 w-full text-right text-black text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">명단 / 메모</label>
                                    {type === '주일헌금' ? (
                                        <input
                                            type="text"
                                            disabled
                                            className="border rounded-lg p-3 w-full bg-gray-100 text-gray-400 cursor-not-allowed"
                                            value="-"
                                            title="주일헌금은 명단을 입력하지 않습니다."
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={item.memo || ''}
                                            onChange={e => handleLocalUpdate(type, 'memo', e.target.value)}
                                            onBlur={() => handleSave(type)}
                                            className="border rounded-lg p-3 w-full text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="이름 입력 (쉼표로 구분)"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                    <span className="font-bold text-gray-900">총 합계</span>
                    <span className="font-bold text-indigo-700 text-xl">{totalAmount.toLocaleString()} 원</span>
                </div>
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
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
                                            onChange={e => handleLocalUpdate(type, 'amount', e.target.value)}
                                            onBlur={() => handleSave(type)}
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
                                                onChange={e => handleLocalUpdate(type, 'memo', e.target.value)}
                                                onBlur={() => handleSave(type)}
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
