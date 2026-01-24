
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Class } from '@/types/database';
import { Trash2, Plus } from 'lucide-react';

export default function ClassManager() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<'Middle' | 'High'>('Middle');

    useEffect(() => {
        fetchClasses();
    }, [selectedGrade]);

    const fetchClasses = async () => {
        const { data } = await supabase
            .from('classes')
            .select('*')
            .eq('grade', selectedGrade)
            .order('name');
        setClasses(data || []);
    };

    const addClass = async () => {
        if (!newClassName.trim()) return;
        const { error } = await supabase
            .from('classes')
            .insert([{ grade: selectedGrade, name: newClassName }]);

        if (error) {
            alert('반 추가 실패: ' + error.message);
        } else {
            setNewClassName('');
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {classes.map(cls => (
                    <div key={cls.id} className="border p-3 rounded flex justify-between items-center bg-gray-50">
                        <span className="font-bold text-gray-800">{cls.name}</span>
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
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder={`${selectedGrade === 'Middle' ? '중' : '고'} N반 or 반이름`}
                    className="border p-2 rounded flex-1 text-black"
                    onKeyDown={e => e.key === 'Enter' && addClass()}
                />
                <button
                    onClick={addClass}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-1"
                >
                    <Plus size={16} /> 추가
                </button>
            </div>
        </div>
    );
}
