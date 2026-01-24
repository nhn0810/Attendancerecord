
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Class } from '@/types/database';
import { Trash2, Plus } from 'lucide-react';

export default function ClassManager() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<'Middle' | 'High'>('Middle');

    // Teacher Management
    const [teachers, setTeachers] = useState<{ id: string, name: string }[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    useEffect(() => {
        fetchTeachers();
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [selectedGrade]);

    const fetchTeachers = async () => {
        const { data } = await supabase.from('teachers').select('id, name').eq('is_active', true).order('name');
        setTeachers(data || []);
    };

    const fetchClasses = async () => {
        const { data } = await supabase
            .from('classes')
            .select('*, teachers(name)')
            .eq('grade', selectedGrade)
            .order('name');
        setClasses(data || []);
    };

    const addClass = async () => {
        if (!newClassName.trim()) return;

        const payload: any = { grade: selectedGrade, name: newClassName };
        if (selectedTeacherId) payload.teacher_id = selectedTeacherId;

        const { error } = await supabase
            .from('classes')
            .insert([payload]);

        if (error) {
            alert('반 추가 실패: ' + error.message);
        } else {
            setNewClassName('');
            setSelectedTeacherId('');
            fetchClasses();
        }
    };

    const deleteClass = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까? 해당 반에 소속된 학생들은 "미배정" 상태가 됩니다.')) return;
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) alert('삭제 실패');
        else fetchClasses();
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-black">🏫 반(Class) 관리</h2>
            </div>

            {/* Grade Selector */}
            <div className="flex gap-4 mb-4 border-b pb-2">
                <button
                    onClick={() => setSelectedGrade('Middle')}
                    className={`px-4 py-2 rounded font-bold ${selectedGrade === 'Middle' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                    중등부
                </button>
                <button
                    onClick={() => setSelectedGrade('High')}
                    className={`px-4 py-2 rounded font-bold ${selectedGrade === 'High' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                    고등부
                </button>
            </div>

            {/* Class List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {classes.map(cls => (
                    <div key={cls.id} className="border p-3 rounded flex justify-between items-center bg-gray-50">
                        <div>
                            <span className="font-bold text-gray-800 block">{cls.name}</span>
                            {cls.teachers?.name && (
                                <span className="text-sm text-blue-600 font-medium tracking-tight">
                                    (담임: {cls.teachers.name})
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => deleteClass(cls.id)}
                            className="text-red-500 p-1 hover:bg-red-100 rounded"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Input */}
            <div className="flex flex-col md:flex-row gap-2 items-end md:items-center">
                <input
                    type="text"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder={`${selectedGrade === 'Middle' ? '중' : '고'} N반 이름`}
                    className="border p-2 rounded flex-1 text-black w-full"
                />
                <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="border p-2 rounded text-black w-full md:w-auto"
                >
                    <option value="">담당교사 선택 (선택안함)</option>
                    {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <button
                    onClick={addClass}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-1 w-full md:w-auto justify-center"
                >
                    <Plus size={16} /> 추가
                </button>
            </div>
        </div>
    );
}
