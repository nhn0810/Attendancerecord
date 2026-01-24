
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Teacher } from '@/types/database';

interface StaffCheckProps {
    logId: string | null;
}

export default function StaffCheck({ logId }: StaffCheckProps) {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
    const [isEditMode, setIsEditMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'Teacher' | 'Staff'>('Teacher');

    useEffect(() => {
        fetchTeachers();
    }, []);

    useEffect(() => {
        if (logId) fetchAttendance();
        else setPresentMap({});
    }, [logId]);

    const fetchTeachers = async () => {
        const { data } = await supabase.from('teachers').select('*').eq('is_active', true).order('role');
        setTeachers(data || []);
    };

    const fetchAttendance = async () => {
        if (!logId) return;
        const { data } = await supabase.from('teacher_attendance').select('teacher_id').eq('log_id', logId);
        const map: Record<string, boolean> = {};
        data?.forEach(d => map[d.teacher_id] = true);
        setPresentMap(map);
    };

    const toggle = async (teacherId: string) => {
        if (!logId) {
            alert('예배 정보를 먼저 저장해주세요.');
            return;
        }
        const isPresent = !!presentMap[teacherId];

        // Optimistic
        setPresentMap(prev => {
            const next = { ...prev };
            if (isPresent) delete next[teacherId];
            else next[teacherId] = true;
            return next;
        });

        if (isPresent) {
            await supabase.from('teacher_attendance').delete().eq('log_id', logId).eq('teacher_id', teacherId);
        } else {
            await supabase.from('teacher_attendance').insert({ log_id: logId, teacher_id: teacherId, is_present: true });
        }
    };

    const addStaff = async () => {
        if (!newName.trim()) return;
        await supabase.from('teachers').insert({ name: newName, role: newRole });
        setNewName('');
        fetchTeachers();
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-black">4. 교사 및 간사 출석 ({Object.keys(presentMap).length}명)</h2>
                <button onClick={() => setIsEditMode(!isEditMode)} className="text-sm bg-gray-200 px-2 rounded text-black">
                    {isEditMode ? '완료' : '명단 관리'}
                </button>
            </div>

            {isEditMode && (
                <div className="flex gap-2 mb-4 p-2 bg-gray-50">
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름" className="border p-1 text-black" />
                    <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="border p-1 text-black">
                        <option value="Teacher">청년교사</option>
                        <option value="Staff">청년간사</option>
                    </select>
                    <button onClick={addStaff} className="bg-green-500 text-white px-2 rounded">추가</button>
                </div>
            )}

            {/* 청년교사 */}
            <div className="mb-4">
                <h3 className="font-bold text-md mb-2">청년교사</h3>
                <div className="flex flex-wrap gap-2">
                    {teachers.filter(t => t.role === 'Teacher').map(t => (
                        <button
                            key={t.id}
                            onClick={() => toggle(t.id)}
                            className={`px-3 py-1 rounded-full border ${presentMap[t.id] ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'text-gray-500'}`}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 청년간사 */}
            <div>
                <h3 className="font-bold text-md mb-2">청년간사</h3>
                <div className="flex flex-wrap gap-2">
                    {teachers.filter(t => t.role === 'Staff').map(t => (
                        <button
                            key={t.id}
                            onClick={() => toggle(t.id)}
                            className={`px-3 py-1 rounded-full border ${presentMap[t.id] ? 'bg-purple-100 border-purple-500 text-purple-700 font-bold' : 'text-gray-500'}`}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
