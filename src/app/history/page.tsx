'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { WorshipLog } from '@/types/database';
import Link from 'next/link';

interface EnhancedLog extends WorshipLog {
    totalOffering?: number;
    attendanceCount?: number;
}

export default function HistoryPage() {
    const [logs, setLogs] = useState<EnhancedLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        const { data: logsData } = await supabase
            .from('worship_logs')
            .select('*')
            .order('date', { ascending: false });

        if (!logsData || logsData.length === 0) {
            setLogs([]);
            setLoading(false);
            return;
        }

        const logIds = logsData.map(l => l.id);

        // Fetch attendance
        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('log_id')
            .in('log_id', logIds);

        const attendanceCountMap: Record<string, number> = {};
        attendanceData?.forEach(a => {
            attendanceCountMap[a.log_id] = (attendanceCountMap[a.log_id] || 0) + 1;
        });

        // Fetch offerings
        const { data: offeringData } = await supabase
            .from('offerings')
            .select('log_id, amount')
            .in('log_id', logIds);

        const offeringTotalMap: Record<string, number> = {};
        offeringData?.forEach(o => {
            offeringTotalMap[o.log_id] = (offeringTotalMap[o.log_id] || 0) + (o.amount || 0);
        });

        const enhancedLogs = logsData.map(log => ({
            ...log,
            totalOffering: offeringTotalMap[log.id] || 0,
            attendanceCount: attendanceCountMap[log.id] || 0
        }));

        setLogs(enhancedLogs);
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

                                    <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
                                        <span className="text-gray-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                            출석 <strong className="text-blue-700">{log.attendanceCount}명</strong>
                                        </span>
                                        <span className="text-gray-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                            헌금 <strong className="text-indigo-700">{(log.totalOffering || 0).toLocaleString()}원</strong>
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
                                    <th className="p-4 font-bold text-gray-700 text-center">출석 인원</th>
                                    <th className="p-4 font-bold text-gray-700 text-right">총 헌금액</th>
                                    <th className="p-4 font-bold text-gray-700 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors text-black">
                                        <td className="p-4 font-medium">{log.date}</td>
                                        <td className="p-4">{log.sermon_title || '-'}</td>
                                        <td className="p-4">{log.preacher || '-'}</td>
                                        <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/30">
                                            {log.attendanceCount}명
                                        </td>
                                        <td className="p-4 text-right text-indigo-700 font-bold bg-indigo-50/30">
                                            {(log.totalOffering || 0).toLocaleString()}원
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
                                        <td colSpan={6} className="p-8 text-center text-gray-500">기록이 없습니다.</td>
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
