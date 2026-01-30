'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { WorshipLog } from '@/types/database';
import Link from 'next/link';

export default function HistoryPage() {
    const [logs, setLogs] = useState<WorshipLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('worship_logs')
            .select('*')
            .order('date', { ascending: false });
        setLogs(data || []);
        setLoading(false);
    };

    const deleteLog = async (id: string) => {
        if (!confirm('정말 이 기록을 삭제하시겠습니까? (복구 불가)')) return;
        await supabase.from('worship_logs').delete().eq('id', id);
        fetchLogs();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">📅 예배일지 기록 (History)</h1>
                    <Link href="/" className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                        ← 메인으로 돌아가기
                    </Link>
                </div>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-4">
                            {logs.map(log => (
                                <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                {log.date}
                                            </div>
                                            <div className="mt-1">
                                                <p className="text-gray-900 font-medium">{log.sermon_title || '(제목 없음)'}</p>
                                                <p className="text-sm text-gray-500">{log.preacher || '-'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteLog(log.id)}
                                            className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                                            title="삭제"
                                        >
                                            <span className="text-xs font-bold">삭제</span>
                                        </button>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-sm text-gray-500">쿠폰 지급액</span>
                                        <span className="font-bold text-indigo-600 text-lg">
                                            {((log.coupon_recipient_count || 0) * (log.coupons_per_person || 0) * 1000).toLocaleString()}원
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">기록이 없습니다.</div>
                            )}
                        </div>

                        {/* Desktop View: Table */}
                        <table className="hidden md:table w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b-2 border-gray-200">
                                    <th className="p-4 font-bold text-gray-700">날짜</th>
                                    <th className="p-4 font-bold text-gray-700">말씀 제목</th>
                                    <th className="p-4 font-bold text-gray-700">설교자</th>
                                    <th className="p-4 font-bold text-gray-700">쿠폰 지급액</th>
                                    <th className="p-4 font-bold text-gray-700 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors text-black">
                                        <td className="p-4 font-medium">{log.date}</td>
                                        <td className="p-4">{log.sermon_title || '-'}</td>
                                        <td className="p-4">{log.preacher || '-'}</td>
                                        <td className="p-4 text-indigo-700 font-bold">
                                            {((log.coupon_recipient_count || 0) * (log.coupons_per_person || 0) * 1000).toLocaleString()}원
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => deleteLog(log.id)}
                                                className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 px-3 py-1 rounded"
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">기록이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
