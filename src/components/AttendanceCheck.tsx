'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Student } from '@/types/database';

interface AttendanceCheckProps {
    logId: string | null;
    classId: string;
    classNameStr: string;
    teacherName?: string;
    allowAddStudent?: boolean;
}

export default function AttendanceCheck({ logId, classId, classNameStr, teacherName, allowAddStudent }: AttendanceCheckProps) {
    const [students, setStudents] = useState<Student[]>([]);

    // Tracking status: 'present' (Offline) | 'online' (Online) | undefined (Absent)
    const [statusMap, setStatusMap] = useState<Record<string, 'present' | 'online'>>({});
    const [loading, setLoading] = useState(false);

    // Fetch Students and Attendance
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Students
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('class_id', classId)
                .eq('is_active', true)
                .order('name');

            if (studentError) throw studentError;
            setStudents(studentData || []);

            // 2. Get Attendance
            if (logId) {
                const { data: attData, error: attError } = await supabase
                    .from('attendance')
                    .select('student_id, status')
                    .eq('log_id', logId);

                if (attError) throw attError;

                const newMap: Record<string, 'present' | 'online'> = {};
                attData?.forEach(a => {
                    if (a.status === 'present' || a.status === 'online') {
                        newMap[a.student_id] = a.status;
                    }
                });
                setStatusMap(newMap);
            } else {
                setStatusMap({});
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [logId, classId]);

    const toggleStatus = async (studentId: string, targetStatus: 'present' | 'online') => {
        if (!logId) {
            alert('먼저 상단의 예배 정보를 저장해주세요.');
            return;
        }

        const currentStatus = statusMap[studentId];

        // Logic: Mutual Exclusion 
        if (currentStatus && currentStatus !== targetStatus) {
            return;
        }

        // Toggle logic
        const isTargetActive = currentStatus === targetStatus;

        // Optimistic Update
        const newMap = { ...statusMap };
        if (isTargetActive) delete newMap[studentId];
        else newMap[studentId] = targetStatus;
        setStatusMap(newMap);

        try {
            if (isTargetActive) {
                // Remove
                await supabase.from('attendance').delete().eq('log_id', logId).eq('student_id', studentId);
            } else {
                // Upsert
                await supabase.from('attendance').upsert({
                    log_id: logId,
                    student_id: studentId,
                    status: targetStatus
                }, { onConflict: 'log_id, student_id' });
            }
        } catch (e) {
            console.error(e);
            fetchData(); // Revert
        }
    };

    const addStudent = async () => {
        const name = prompt('새 학생 이름을 입력하세요:');
        if (!name || !name.trim()) return;

        const { error } = await supabase.from('students').insert({ name: name.trim(), class_id: classId, is_active: true });
        if (error) alert('추가 실패: ' + error.message);
        else fetchData();
    };

    // Counts
    const presentCount = Object.values(statusMap).filter(s => s === 'present').length;
    const onlineCount = Object.values(statusMap).filter(s => s === 'online').length;

    return (
        <div className="border rounded p-4 mb-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">
                    {classNameStr} {teacherName && <span className="text-sm font-normal text-blue-600">({teacherName})</span>}
                </h3>
                <div className="text-sm text-gray-600">
                    현장: <strong className="text-blue-600">{presentCount}</strong> /
                    온라인: <strong className="text-green-600">{onlineCount}</strong> /
                    재적: {students.length}
                </div>
            </div>

            {/* Offline Row */}
            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                <span className="text-xs font-bold w-12 text-gray-500">현장</span>
                <div className="flex flex-wrap gap-2 flex-1">
                    {students.map(student => {
                        const isPresent = statusMap[student.id] === 'present';
                        const isOnline = statusMap[student.id] === 'online';
                        return (
                            <button
                                key={student.id + '_off'}
                                onClick={() => toggleStatus(student.id, 'present')}
                                disabled={isOnline}
                                className={`
                                    px-3 py-1 rounded-full border transition-all text-sm
                                    ${isPresent
                                        ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold shadow-sm'
                                        : isOnline
                                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed opacity-50'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-white'
                                    }
                                `}
                            >
                                {student.name}
                            </button>
                        );
                    })}
                    {allowAddStudent && (
                        <button onClick={addStudent} className="px-2 py-0.5 rounded border border-dashed border-gray-400 text-gray-400 text-xs hover:border-blue-400 hover:text-blue-500">
                            +
                        </button>
                    )}
                </div>
            </div>

            {/* Online Row */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-xs font-bold w-12 text-gray-500">온라인</span>
                <div className="flex flex-wrap gap-2 flex-1">
                    {students.map(student => {
                        const isPresent = statusMap[student.id] === 'present';
                        const isOnline = statusMap[student.id] === 'online';
                        return (
                            <button
                                key={student.id + '_online'}
                                onClick={() => toggleStatus(student.id, 'online')}
                                disabled={isPresent}
                                className={`
                                    px-3 py-1 rounded-full border transition-all text-sm
                                    ${isOnline
                                        ? 'bg-green-100 border-green-500 text-green-700 font-bold shadow-sm'
                                        : isPresent
                                            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed opacity-50'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-white'
                                    }
                                `}
                            >
                                {student.name}
                            </button>
                        );
                    })}
                </div>
            </div>
            {(!students || students.length === 0) && <p className="text-gray-400 text-sm italic mt-2 ml-14">학생이 없습니다.</p>}
        </div>
    );
}
