
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Class, Student } from '@/types/database';
import { Trash2 } from 'lucide-react';

export default function RosterManager() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string>('unassigned');
    const [newStudentName, setNewStudentName] = useState('');

    const addStudent = async () => {
        const val = newStudentName.trim();
        if (!val) return;
        await supabase.from('students').insert([{ name: val, class_id: null }]);
        setNewStudentName('');
        fetchData();
    };

    // Load Data
    const fetchData = async () => {
        setLoading(true);
        const [cRes, sRes] = await Promise.all([
            supabase.from('classes').select('*').order('name'),
            supabase.from('students').select('*').eq('is_active', true).order('name')
        ]);
        setClasses(cRes.data || []);
        setStudents(sRes.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Actions
    const moveStudent = async (studentId: string, targetClassId: string | null) => {
        const { error } = await supabase
            .from('students')
            .update({ class_id: targetClassId })
            .eq('id', studentId);

        if (error) alert('이동 실패');
        else {
            // Optimistic update
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, class_id: targetClassId } : s));
        }
    };

    const deleteStudent = async (studentId: string) => {
        if (!confirm('정말 명단에서 삭제하시겠습니까? (복구 불가)')) return;
        const { error } = await supabase.from('students').delete().eq('id', studentId);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            setStudents(prev => prev.filter(s => s.id !== studentId));
        }
    };

    // Grouping
    const unassignedStudents = students.filter(s => !s.class_id);
    const assignedStudents = students.filter(s => s.class_id);

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📋 전체 명단 배치 (Roster)</h2>
                <button onClick={fetchData} className="text-sm bg-gray-200 px-3 py-1 rounded text-black">
                    새로고침
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[70vh] min-h-[500px]">
                {/* Left: Unassigned / Source */}
                <div className="border rounded-lg p-3 flex flex-col bg-gray-50 h-full overflow-hidden">
                    <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">
                        미배정 학생 ({unassignedStudents.length})
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {unassignedStudents.map(s => (
                            <div key={s.id} className="bg-white p-2 rounded shadow-sm flex justify-between items-center border group">
                                <span className="text-black font-medium">{s.name}</span>
                                <div className="flex items-center gap-2">
                                    <select
                                        className="text-xs border p-1 rounded text-black max-w-[100px]"
                                        onChange={(e) => moveStudent(s.id, e.target.value)}
                                        value=""
                                    >
                                        <option value="" disabled>반 선택...</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.grade === 'Middle' ? '중' : '고'} {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => deleteStudent(s.id)}
                                        className="text-gray-300 hover:text-red-500 p-1"
                                        title="삭제"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Create New Student Inline */}
                    <div className="mt-2 pt-2 border-t">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border p-2 rounded text-sm text-black"
                                placeholder="새 학생 이름 입력"
                                value={newStudentName}
                                onChange={e => setNewStudentName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') addStudent();
                                }}
                            />
                            <button
                                onClick={addStudent}
                                className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700 whitespace-nowrap"
                            >
                                추가
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Classes View */}
                <div className="border rounded-lg p-3 flex flex-col bg-gray-50 h-full overflow-hidden">
                    <div className="flex justify-between mb-2 pb-2 border-b">
                        <h3 className="font-bold text-gray-700">반별 현황</h3>
                        <select
                            className="text-sm border rounded p-1 text-black"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                        >
                            <option value="unassigned">-- 반 보기 선택 --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.grade === 'Middle' ? '중' : '고'} {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {selectedClassId !== 'unassigned' && (
                            <div className="space-y-1">
                                {students.filter(s => s.class_id === selectedClassId).map(s => (
                                    <div key={s.id} className="bg-white p-2 rounded shadow-sm flex justify-between items-center border group">
                                        <span className="text-black">{s.name}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => moveStudent(s.id, null)}
                                                className="text-xs text-blue-500 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200"
                                            >
                                                미배정 이동
                                            </button>
                                            <button
                                                onClick={() => deleteStudent(s.id)}
                                                className="text-gray-300 hover:text-red-500 p-1 ml-1"
                                                title="삭제"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {students.filter(s => s.class_id === selectedClassId).length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">학생이 없습니다.</p>
                                )}
                            </div>
                        )}
                        {selectedClassId === 'unassigned' && (
                            <div className="text-center text-gray-500 mt-10">
                                위 드롭다운에서 반을 선택하여<br />배정된 학생을 확인하세요.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
