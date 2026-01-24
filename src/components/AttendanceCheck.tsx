
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Student } from '@/types/database';
import { Plus } from 'lucide-react';

interface AttendanceCheckProps {
    logId: string | null;
    classId: string;
    classNameStr: string;
    teacherName?: string;
    allowAddStudent?: boolean;
}

export default function AttendanceCheck({ logId, classId, classNameStr, teacherName, allowAddStudent }: AttendanceCheckProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendanceSet, setAttendanceSet] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    // Fetch Students and Attendance
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Students for this class
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('class_id', classId)
                .eq('is_active', true)
                .order('name');

            if (studentError) throw studentError;
            setStudents(studentData || []);

            // 2. Get Attendance if logId exists
            if (logId) {
                const { data: attData, error: attError } = await supabase
                    .from('attendance')
                    .select('student_id')
                    .eq('log_id', logId);

                if (attError) throw attError;
                const presentIds = new Set(attData?.map(a => a.student_id));
                setAttendanceSet(presentIds);
            } else {
                setAttendanceSet(new Set());
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

    const toggleAttendance = async (studentId: string) => {
        if (!logId) {
            alert('먼저 상단의 예배 정보를 저장해주세요.');
            return;
        }

        const isPresent = attendanceSet.has(studentId);

        // Optimistic
        const newSet = new Set(attendanceSet);
        if (isPresent) newSet.delete(studentId);
        else newSet.add(studentId);
        setAttendanceSet(newSet);

        try {
            if (isPresent) {
                await supabase.from('attendance').delete().eq('log_id', logId).eq('student_id', studentId);
            } else {
                await supabase.from('attendance').insert({ log_id: logId, student_id: studentId, status: 'present' });
            }
        } catch (e) {
            console.error(e);
            fetchData(); // Revert
        }
    };

    // Let's show it so user knows the class exists.
    const addStudent = async () => {
        const name = prompt('새 학생 이름을 입력하세요:');
        if (!name || !name.trim()) return;

        const { error } = await supabase.from('students').insert({ name: name.trim(), class_id: classId, is_active: true });
        if (error) alert('추가 실패: ' + error.message);
        else fetchData();
    };

    return (
        <div className="border rounded p-4 mb-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">
                    {classNameStr} {teacherName && <span className="text-sm font-normal text-blue-600">({teacherName})</span>}
                </h3>
                <div className="text-sm text-gray-600">
                    출석: <strong className="text-blue-600">{attendanceSet.size}</strong> / {students.length}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
                {students.map(student => (
                    <button
                        key={student.id}
                        onClick={() => toggleAttendance(student.id)}
                        className={`
              px-3 py-1 rounded-full border transition-all
              ${attendanceSet.has(student.id)
                                ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold shadow-sm'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }
            `}
                    >
                        {student.name}
                    </button>
                ))}

                {allowAddStudent && (
                    <button
                        onClick={addStudent}
                        className="px-3 py-1 rounded-full border border-dashed border-gray-400 text-gray-400 hover:border-blue-400 hover:text-blue-500 flex items-center gap-1"
                    >
                        <Plus size={14} /> 추가
                    </button>
                )}

                {!allowAddStudent && students.length === 0 && <p className="text-gray-400 text-sm italic">학생이 없습니다.</p>}
            </div>
        </div>
    );
}
