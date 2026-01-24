
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';

export default function StatsPage() {
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Jan 1st
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today

    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalServices, setTotalServices] = useState(0);

    const calculateStats = async () => {
        setLoading(true);
        try {
            // 1. Get Logs in Range
            const { data: logs } = await supabase
                .from('worship_logs')
                .select('id')
                .gte('date', startDate)
                .lte('date', endDate);

            const logIds = logs?.map(l => l.id) || [];
            const serviceCount = logIds.length;
            setTotalServices(serviceCount);

            if (serviceCount === 0) {
                setStats([]);
                setLoading(false);
                return;
            }

            // 2. Get All Students
            const { data: students } = await supabase
                .from('students')
                .select('id, name, classes(name, grade)')
                .eq('is_active', true)
                .order('name');

            // 3. Get Attendance Counts
            const { data: attendance } = await supabase
                .from('attendance')
                .select('student_id')
                .in('log_id', logIds);

            const attendanceMap: Record<string, number> = {};
            attendance?.forEach(a => {
                attendanceMap[a.student_id] = (attendanceMap[a.student_id] || 0) + 1;
            });

            // 4. Transform Data
            const rows = students?.map(s => {
                const present = attendanceMap[s.id] || 0;
                const rate = (present / serviceCount) * 100;
                // Since it's a left join and we expect one class per student, Supabase returns an object or null if singular, but type inference might vary.
                // We cast 'classes' to any to avoid complex typing for now, knowing the shape.
                const cls = s.classes as any;
                const className = cls ? `${cls.grade === 'Middle' ? '중' : '고'} ${cls.name}` : '미배정';

                return {
                    id: s.id,
                    name: s.name,
                    className,
                    present,
                    rate: rate.toFixed(1),
                    isPerfect: present === serviceCount
                };
            }) || [];

            // Sort by Rate Descending
            rows.sort((a, b) => Number(b.rate) - Number(a.rate));
            setStats(rows);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        calculateStats();
    }, []);

    // Detail Modal Logic
    const [selectedStudent, setSelectedStudent] = useState<{ id: string, name: string } | null>(null);
    const [studentLogs, setStudentLogs] = useState<{ logId: string, date: string, present: boolean }[]>([]);

    const openStudentDetail = async (studentId: string, studentName: string) => {
        setSelectedStudent({ id: studentId, name: studentName });

        // Fetch all logs in range first (we might have them in logic, but let's fetch cleanly or reuse)
        const { data: logs } = await supabase
            .from('worship_logs')
            .select('id, date')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (!logs) return;

        // Fetch this student's attendance
        const { data: att } = await supabase
            .from('attendance')
            .select('log_id')
            .eq('student_id', studentId)
            .in('log_id', logs.map(l => l.id));

        const presentSet = new Set(att?.map(a => a.log_id));

        const combined = logs.map(l => ({
            logId: l.id,
            date: l.date,
            present: presentSet.has(l.id)
        }));

        setStudentLogs(combined);
    };

    const toggleAttendance = async (logId: string, currentStatus: boolean) => {
        if (!selectedStudent) return;

        // Optimistic Update
        setStudentLogs(prev => prev.map(l => l.logId === logId ? { ...l, present: !currentStatus } : l));

        if (currentStatus) {
            // Was present, now deleting
            await supabase.from('attendance').delete().eq('log_id', logId).eq('student_id', selectedStudent.id);
        } else {
            // Was absent, now inserting
            await supabase.from('attendance').insert({ log_id: logId, student_id: selectedStudent.id, status: 'present' });
        }
        // Refresh stats in background
        calculateStats();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">📊 출석 통계 (Statistics)</h1>
                    <Link href="/" className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                        ← 메인으로 돌아가기
                    </Link>
                </div>

                {/* Filter */}
                <div className="bg-gray-50 p-4 rounded mb-6 flex gap-4 items-end border">
                    <div>
                        <label className="block text-sm font-bold text-gray-700">시작일</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border p-2 rounded text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700">종료일</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border p-2 rounded text-black"
                        />
                    </div>
                    <button
                        onClick={calculateStats}
                        className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700"
                    >
                        조회
                    </button>
                    <div className="ml-auto text-gray-600">
                        총 예배 횟수: <strong className="text-black text-lg">{totalServices}</strong>회
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <p>Calculating...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <p className="text-sm text-gray-500 mb-2 italic">* 학생 이름을 클릭하면 세부 출석 내용을 수정할 수 있습니다.</p>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-indigo-50 border-b-2 border-indigo-200">
                                    <th className="p-3 font-bold text-gray-700">이름</th>
                                    <th className="p-3 font-bold text-gray-700">소속 반</th>
                                    <th className="p-3 font-bold text-gray-700 text-center">출석 횟수</th>
                                    <th className="p-3 font-bold text-gray-700 text-center">출석률(%)</th>
                                    <th className="p-3 font-bold text-gray-700 text-center">상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map(row => (
                                    <tr
                                        key={row.id}
                                        className="border-b hover:bg-gray-100 text-black cursor-pointer group"
                                        onClick={() => openStudentDetail(row.id, row.name)}
                                    >
                                        <td className="p-3 font-bold text-indigo-900 group-hover:text-indigo-600 underline decoration-dotted underline-offset-4">{row.name}</td>
                                        <td className="p-3 text-sm text-gray-600">{row.className}</td>
                                        <td className="p-3 text-center">{row.present}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${row.rate}%` }}></div>
                                                </div>
                                                <span className="text-xs w-8">{row.rate}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {row.isPerfect && totalServices > 0 && (
                                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold border border-yellow-400">
                                                    🏆 개근
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name} 학생 출석 상세</h2>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-500 hover:text-black font-bold px-2">
                                ✕
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {studentLogs.length === 0 ? (
                                <p>기간 내 예배 기록이 없습니다.</p>
                            ) : (
                                <div className="space-y-2">
                                    {studentLogs.map((log) => (
                                        <div
                                            key={log.logId}
                                            className={`
                        flex justify-between items-center p-3 rounded border 
                        ${log.present ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}
                      `}
                                        >
                                            <span className="font-medium text-gray-800">{log.date} 예배</span>
                                            <button
                                                onClick={() => toggleAttendance(log.logId, log.present)}
                                                className={`
                                                  px-3 py-1 rounded-md text-sm font-bold transition-colors
                                                  ${log.present
                                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                    }
                                                `}
                                            >
                                                {log.present ? '출석됨' : '결석'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-lg text-right">
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
