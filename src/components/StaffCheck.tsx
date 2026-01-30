'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Teacher } from '@/types/database';

interface StaffCheckProps {
    logId: string | null;
}

import { Trash2 } from 'lucide-react';

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
        if (isEditMode) return; // Prevent toggling in edit mode

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

    const deleteStaff = async (id: string, name: string) => {
        if (!confirm(`'${name}' 님을 명단에서 삭제하시겠습니까?`)) return;
        const { error } = await supabase.from('teachers').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchTeachers();
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-black">4. 교사 및 간사 출석 ({Object.keys(presentMap).length}명)</h2>
                <button onClick={() => setIsEditMode(!isEditMode)} className="text-sm bg-gray-200 px-2 rounded text-black hover:bg-gray-300 transition-colors">
                    {isEditMode ? '완료' : '명단 관리'}
                </button>
            </div>

            {isEditMode && (
                <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-gray-50 rounded border">
                    <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="이름 입력"
                        className="border p-2 rounded text-black flex-1 min-w-0 outline-none focus:border-indigo-500 w-full"
                    />
                    <div className="flex gap-2">
                        <select
                            value={newRole}
                            onChange={e => setNewRole(e.target.value as any)}
                            className="border p-2 rounded text-black bg-white outline-none focus:border-indigo-500 flex-1 sm:flex-none"
                        >
                            <option value="Teacher">청년교사</option>
                            <option value="Staff">청년간사</option>
                        </select>
                        <button
                            onClick={addStaff}
                            className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 whitespace-nowrap min-w-[60px]"
                        >
                            추가
                        </button>
                    </div>
                </div>
            )}

            {/* 청년교사 */}
            <div className="mb-4">
                <h3 className="font-bold text-md mb-2 text-black">청년교사</h3>
                <div className="flex flex-wrap gap-2">
                    {teachers.filter(t => t.role === 'Teacher').map(t => (
                        <div key={t.id} className="relative group">
                            <button
                                onClick={() => toggle(t.id)}
                                disabled={isEditMode}
                                className={`px-3 py-1 rounded-full border transition-all ${presentMap[t.id] ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'} ${isEditMode ? 'opacity-50 cursor-default' : ''}`}
                            >
                                {t.name}
                            </button>
                            {isEditMode && (
                                <button
                                    onClick={() => deleteStaff(t.id, t.name)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center shadow-sm hover:bg-red-600 z-10"
                                >
                                    <span className="text-xs font-bold">×</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 청년간사 */}
            <div>
                <h3 className="font-bold text-md mb-2 text-black">청년간사</h3>
                <div className="flex flex-wrap gap-2">
                    {teachers.filter(t => t.role === 'Staff').map(t => (
                        <div key={t.id} className="relative group">
                            <button
                                onClick={() => toggle(t.id)}
                                disabled={isEditMode}
                                className={`px-3 py-1 rounded-full border transition-all ${presentMap[t.id] ? 'bg-purple-100 border-purple-500 text-purple-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50'} ${isEditMode ? 'opacity-50 cursor-default' : ''}`}
                            >
                                {t.name}
                            </button>
                            {isEditMode && (
                                <button
                                    onClick={() => deleteStaff(t.id, t.name)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center shadow-sm hover:bg-red-600 z-10"
                                >
                                    <span className="text-xs font-bold">×</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
