'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Class, Student } from '@/types/database';
import { Trash2, Settings, ArrowLeft, Save, X, Plus } from 'lucide-react';
import StudentNameDisplay from './StudentNameDisplay';

interface RosterManagerProps {
    currentDate?: string;
}

export default function RosterManager({ currentDate }: RosterManagerProps) {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    // Add Student State
    const [newStudentName, setNewStudentName] = useState('');

    // Edit Student Modal State
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState('');
    const [isNewFriend, setIsNewFriend] = useState(false);
    const [isHanGwaYoung, setIsHanGwaYoung] = useState(false);

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

    // --- Actions ---

    const addStudent = async () => {
        const val = newStudentName.trim();
        if (!val) return;

        const payload = { class_id: null, is_active: true };
        import('@/utils/studentUtils').then(m => {
            m.addStudentWithVerification(val, payload, () => {
                setNewStudentName('');
                fetchData();
            });
        });
    };

    const moveStudent = async (studentId: string, targetClassId: string | null) => {
        const updates: any = { class_id: targetClassId };

        if (targetClassId) {
            const { data: s } = await supabase.from('students').select('tags, first_visit_date').eq('id', studentId).single();
            const currentTags = s?.tags || [];
            if (currentTags.includes('새친구') || s?.first_visit_date) {
                updates.tags = currentTags.filter((t: string) => t !== '새친구');
                updates.class_assigned_date = currentDate || new Date().toISOString().split('T')[0];
            }
        }

        const { error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', studentId);

        if (error) alert('이동 실패');
        else {
            if (targetClassId) {
                // If moving to a class, we might want to refresh to see stats update or just optimistic
                // However, user flow suggests just dragging or clicking
            }
            fetchData();
        }
    };

    const deleteStudent = async (studentId: string) => {
        if (!confirm('불필요한 데이터라면 삭제해도 좋지만, 이름을 삭제하면 출석기록도 함께 삭제되어 되돌릴 수 없습니다.\n정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('students').delete().eq('id', studentId);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            setStudents(prev => prev.filter(s => s.id !== studentId));
        }
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setEditName(student.name);
        const tags = student.tags || [];
        setIsNewFriend(tags.includes('새친구'));
        setIsHanGwaYoung(tags.includes('한과영'));
    };

    const saveStudentEdit = async () => {
        if (!editingStudent) return;

        const newTags: string[] = [];
        if (isNewFriend) newTags.push('새친구');
        if (isHanGwaYoung) newTags.push('한과영');

        const updates: any = {
            name: editName,
            tags: newTags
        };

        const wasNewFriend = editingStudent.tags?.includes('새친구');
        if (!wasNewFriend && isNewFriend) {
            if (!confirm('새친구 태그를 부여하면 이전의 출석기록은 사라집니다.\n계속하시겠습니까?')) {
                return;
            }
            updates.first_visit_date = currentDate || new Date().toISOString().split('T')[0];
            updates.class_assigned_date = null;
        }

        const { error } = await supabase
            .from('students')
            .update(updates)
            .eq('id', editingStudent.id);

        if (error) alert('수정 실패: ' + error.message);
        else {
            setEditingStudent(null);
            fetchData();
        }
    };

    // --- Derived Data ---
    const unassignedStudents = students.filter(s => !s.class_id);
    const middleClasses = classes.filter(c => c.grade === 'Middle');
    const highClasses = classes.filter(c => c.grade === 'High');

    return (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📋 전체 명단 관리</h2>
                <button onClick={fetchData} className="text-sm bg-gray-200 px-3 py-1 rounded text-black hover:bg-gray-300">
                    새로고침
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[500px]">
                {/* Left: Unassigned Students */}
                <div className="border rounded-lg p-3 flex flex-col bg-gray-50 h-[600px] overflow-hidden">
                    <h3 className="font-bold text-gray-700 mb-2 border-b pb-2 flex justify-between items-center">
                        미배정 학생 ({unassignedStudents.length})
                        <span className="text-xs font-normal text-gray-500">대기 명단</span>
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {unassignedStudents.map(s => (
                            <div key={s.id} className="bg-white p-2 rounded shadow-sm flex justify-between items-center border group hover:border-indigo-300 transition-colors">
                                <StudentNameDisplay student={s} className="font-medium" />
                                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(s)}
                                        className="p-1 text-gray-400 hover:text-blue-600 rounded bg-gray-50 border"
                                        title="설정"
                                    >
                                        <Settings size={14} />
                                    </button>
                                    <select
                                        className="text-xs border p-1 rounded text-black max-w-[100px] bg-white cursor-pointer"
                                        onChange={(e) => moveStudent(s.id, e.target.value)}
                                        value=""
                                    >
                                        <option value="" disabled>반 배정...</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
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
                        {unassignedStudents.length === 0 && (
                            <p className="text-center text-gray-400 py-4 text-sm">미배정 학생이 없습니다.</p>
                        )}
                    </div>

                    {/* Add Student */}
                    <div className="mt-2 pt-2 border-t">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 border p-2 rounded text-sm text-black outline-none focus:border-indigo-500"
                                placeholder="새 학생 이름 입력"
                                value={newStudentName}
                                onChange={e => setNewStudentName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') addStudent();
                                }}
                            />
                            <button
                                onClick={addStudent}
                                className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700 whitespace-nowrap flex items-center"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Class Management */}
                <div className="border rounded-lg p-3 flex flex-col bg-gray-50 h-[600px] overflow-hidden">
                    <div className="mb-2 pb-2 border-b flex justify-between items-center h-10">
                        {viewMode === 'detail' && selectedClass ? (
                            <div className="flex items-center gap-2 w-full">
                                <button
                                    onClick={() => { setViewMode('grid'); setSelectedClass(null); }}
                                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <h3 className="font-bold text-gray-800 text-lg">
                                    {selectedClass.name}
                                </h3>
                            </div>
                        ) : (
                            <h3 className="font-bold text-gray-700">반별 현황 (반 선택)</h3>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {viewMode === 'grid' ? (
                            <div className="space-y-6 p-2">
                                <div>
                                    <h4 className="font-bold text-sm text-gray-500 mb-2">중등부</h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {middleClasses.map(cls => (
                                            <button
                                                key={cls.id}
                                                onClick={() => { setSelectedClass(cls); setViewMode('detail'); }}
                                                className="bg-white p-4 rounded shadow border hover:border-indigo-500 hover:shadow-md transition-all text-center"
                                            >
                                                <span className="block font-bold text-indigo-900 text-lg mb-1">{cls.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {students.filter(s => s.class_id === cls.id).length}명
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-500 mb-2">고등부</h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {highClasses.map(cls => (
                                            <button
                                                key={cls.id}
                                                onClick={() => { setSelectedClass(cls); setViewMode('detail'); }}
                                                className="bg-white p-4 rounded shadow border hover:border-indigo-500 hover:shadow-md transition-all text-center"
                                            >
                                                <span className="block font-bold text-indigo-900 text-lg mb-1">{cls.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {students.filter(s => s.class_id === cls.id).length}명
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 p-1">
                                {selectedClass && students.filter(s => s.class_id === selectedClass.id).map(s => (
                                    <div key={s.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center border group">
                                        <div className="flex items-center gap-2">
                                            <StudentNameDisplay student={s} className="font-medium text-lg" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(s)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded bg-gray-50 border hover:bg-blue-50 transition-colors"
                                                title="설정 (태그/이름 수정)"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            <button
                                                onClick={() => moveStudent(s.id, null)}
                                                className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded border border-orange-200"
                                            >
                                                내보내기
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {selectedClass && students.filter(s => s.class_id === selectedClass.id).length === 0 && (
                                    <div className="text-center py-10 text-gray-400 italic">
                                        이 반에 배정된 학생이 없습니다.
                                        <br />
                                        <span className="text-xs">왼쪽 미배정 목록에서 학생을 선택하여 이동시킬 수 있습니다.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Settings size={18} />
                                학생 정보 수정
                            </h3>
                            <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">이름</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full border-2 border-gray-200 p-2 rounded-lg focus:border-indigo-500 outline-none text-lg text-black"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">특수 태그 (Tags)</label>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isNewFriend}
                                            onChange={e => setIsNewFriend(e.target.checked)}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-green-600">새친구 (New Friend)</span>
                                            <span className="text-xs text-gray-500">이름이 초록색 굵은 글씨로 표시됩니다.</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-amber-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isHanGwaYoung}
                                            onChange={e => setIsHanGwaYoung(e.target.checked)}
                                            className="w-5 h-5 text-amber-700 rounded focus:ring-amber-600"
                                        />
                                        <div className="flex flex-col">
                                            <span className="italic text-amber-700 font-serif">한과영 (Science Academy)</span>
                                            <span className="text-xs text-gray-500">이름이 갈색 기울임체로 표시됩니다.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={saveStudentEdit}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2 transform active:scale-95 transition-all"
                            >
                                <Save size={18} />
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
