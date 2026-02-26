'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Student } from '@/types/database';
import { Settings, Plus, Trash2, UserPlus, X, Save } from 'lucide-react';
import StudentNameDisplay from './StudentNameDisplay';

interface AttendanceCheckProps {
    filterTag?: string; // New Prop for virtual class by tag
    logId: string | null;
    classId?: string; // Made optional
    classNameStr: string;
    teacherName?: string;
    allowAddStudent?: boolean; // Now serves as a default 'show add' but we might allow manage mode universally
    currentDate?: string;
}

export default function AttendanceCheck({ logId, classId, classNameStr, teacherName, allowAddStudent, filterTag, currentDate }: AttendanceCheckProps) {
    const [students, setStudents] = useState<Student[]>([]);

    // Tracking status: 'present' (Offline) | 'online' (Online) | undefined (Absent)
    const [statusMap, setStatusMap] = useState<Record<string, 'present' | 'online'>>({});
    const [loading, setLoading] = useState(false);

    // Manage Mode
    const [isManageMode, setIsManageMode] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Add Student States
    const [addTab, setAddTab] = useState<'create' | 'select'>('create');
    const [newStudentName, setNewStudentName] = useState('');
    const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
    const [selectedUnassignedId, setSelectedUnassignedId] = useState('');

    // Fetch Students and Attendance
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Students
            let query = supabase
                .from('students')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (filterTag) {
                // Filter by Tag using array containment operator, or by new friend dates
                if (filterTag === '새친구' && currentDate) {
                    query = query.or(`tags.cs.{"새친구"},and(first_visit_date.lte.${currentDate},or(class_assigned_date.is.null,class_assigned_date.gt.${currentDate}))`);
                } else {
                    query = query.contains('tags', [filterTag]);
                }
            } else if (classId) {
                // Filter by Class
                query = query.eq('class_id', classId);
            } else {
                // Should not happen unless misconfigured
                setStudents([]);
                setLoading(false);
                return;
            }

            const { data: studentData, error: studentError } = await query;

            if (studentError) throw studentError;

            // Post-process students for date-based visibility
            let filteredStudents = studentData || [];

            if (currentDate) {
                if (filterTag === '새친구') {
                    // 새친구 표출 조건:
                    // 1. 현재 선택한 날짜가 새친구 최초 방문일과 같거나 이후일 것. (과거 날짜의 달력에서는 미래의 새친구가 안보이게)
                    // 2. 현재 선택한 날짜가 반 배정일보다 엄격하게 이전일 것. (or 반배정을 아직 안받았거나)
                    filteredStudents = filteredStudents.filter(s => {
                        const isAfterVisit = s.first_visit_date ? s.first_visit_date <= currentDate : true;
                        const isBeforeAssigned = !s.class_assigned_date || currentDate < s.class_assigned_date;

                        // 현재 태그가 '새친구'이더라도, 날짜 조건을 우선해야 과거/미래 달력 기믹이 성립함 
                        return isAfterVisit && isBeforeAssigned;
                    });
                } else if (classId) {
                    // 정규 반 학생 표출 조건:
                    // 반 배정일(class_assigned_date)이 존재한다면, 그 날짜와 같거나 이후여야 함.
                    // (배정일 이전 과거 달력에서는 반 명단에 노출되지 않아야 함!)
                    // 배정일이 null이면 기존/레거시 데이터이므로 그냥 노출
                    filteredStudents = filteredStudents.filter(s => {
                        const isAfterAssigned = s.class_assigned_date ? s.class_assigned_date <= currentDate : true;
                        return isAfterAssigned;
                    });
                }
            }

            setStudents(filteredStudents);

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
        if (classId || filterTag) {
            fetchData();
        }
    }, [logId, classId, filterTag]);

    const toggleStatus = async (studentId: string, targetStatus: 'present' | 'online') => {
        if (isManageMode) return; // Disable toggling in manage mode

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

    // --- Manage Mode Functions ---

    const openAddModal = async () => {
        setIsAddModalOpen(true);
        setNewStudentName('');
        setSelectedUnassignedId('');
        // Fetch unassigned students
        const { data } = await supabase
            .from('students')
            .select('*')
            .is('class_id', null)
            .eq('is_active', true)
            .order('name');
        setUnassignedStudents(data || []);
        if (data && data.length > 0) setSelectedUnassignedId(data[0].id);
    };

    const handleAddStudent = async () => {
        if (addTab === 'create') {
            const val = newStudentName.trim();
            if (!val) return;
            const payload: any = {
                is_active: true
            };

            if (filterTag) {
                payload.tags = [filterTag];
                payload.class_id = null; // New friend has no class initially? or Unassigned
                if (filterTag === '새친구' && currentDate) {
                    payload.first_visit_date = currentDate;
                }
            } else {
                payload.class_id = classId;
            }

            import('@/utils/studentUtils').then(m => {
                m.addStudentWithVerification(val, payload, () => {
                    setNewStudentName('');
                    setIsAddModalOpen(false);
                    fetchData();
                });
            });
        } else {
            // Select existing student
            if (!selectedUnassignedId) return;

            if (filterTag) {
                // Add tag to existing student
                const { data: s } = await supabase.from('students').select('tags').eq('id', selectedUnassignedId).single();
                const currentTags = s?.tags || [];
                const updates: any = {
                    tags: [...currentTags.filter((t: string) => t !== filterTag), filterTag]
                };
                if (filterTag === '새친구' && currentDate) {
                    updates.first_visit_date = currentDate;
                    updates.class_assigned_date = null;
                }
                await supabase.from('students').update(updates).eq('id', selectedUnassignedId);
            } else {
                const updates: any = { class_id: classId };

                // If they are currently a new friend, assigning them to a class should set class_assigned_date and remove "새친구" tag.
                const { data: s } = await supabase.from('students').select('tags, first_visit_date').eq('id', selectedUnassignedId).single();
                const currentTags = s?.tags || [];
                if (currentTags.includes('새친구') || s?.first_visit_date) {
                    updates.tags = currentTags.filter((t: string) => t !== '새친구');
                    // Use the calendar's currentDate to record WHEN they were assigned to this class!
                    // If moving directly on a date that is null, fallback to local KST date string
                    const getLocalDateString = () => {
                        const d = new Date();
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        return d.toISOString().split('T')[0];
                    };
                    updates.class_assigned_date = currentDate || getLocalDateString();
                }

                const { error } = await supabase
                    .from('students')
                    .update(updates)
                    .eq('id', selectedUnassignedId);
                if (error) alert('배정 실패: ' + error.message);
            }
            setIsAddModalOpen(false);
            fetchData();
        }
    };

    const handleRemoveStudent = async (studentId: string) => {
        if (!window.confirm('학생 데이터가 완전히 삭제되는 것 대신 미배정 학생으로 전환됩니다. 다시 추가하기 위해서는 반드시!! 미배정 학생에서 추가해주십시오.')) return;

        if (filterTag) {
            // Remove tag
            const { data: s } = await supabase.from('students').select('tags').eq('id', studentId).single();
            const currentTags = s?.tags || [];
            const newTags = currentTags.filter((t: string) => t !== filterTag); // Explicit type for 't'
            await supabase.from('students').update({ tags: newTags }).eq('id', studentId);
        } else {
            // Unassign class
            const { error } = await supabase
                .from('students')
                .update({ class_id: null })
                .eq('id', studentId);
            if (error) alert('제외 실패: ' + error.message);
        }
        fetchData();
    };

    // Counts
    const presentCount = Object.values(statusMap).filter(s => s === 'present').length;
    // const onlineCount = Object.values(statusMap).filter(s => s === 'online').length; // Deprecated

    return (
        <div className={`border rounded p-4 mb-4 shadow-sm transition-colors ${isManageMode ? 'bg-orange-50/50 border-orange-200' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">
                        {classNameStr} {teacherName && <span className="text-sm font-normal text-blue-600">({teacherName})</span>}
                    </h3>
                    <button
                        onClick={() => setIsManageMode(!isManageMode)}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${isManageMode ? 'text-orange-600 bg-orange-100' : 'text-gray-400'}`}
                        title="반 관리 모드"
                    >
                        <Settings size={16} />
                    </button>
                    {isManageMode && <span className="text-xs text-orange-600 font-bold animate-pulse">관리 모드</span>}
                </div>
                <div className="text-sm text-gray-600 flex-shrink-0 text-right whitespace-nowrap">
                    현장: <strong className="text-blue-600">{presentCount}</strong> / 재적: {students.length}
                </div>
            </div>

            {/* Offline Row */}
            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50/50 rounded border border-transparent">
                <span className="text-xs font-bold w-12 text-gray-500">현장</span>
                <div className="flex flex-wrap gap-2 flex-1">
                    {students.map(student => {
                        const isPresent = statusMap[student.id] === 'present';
                        // Ignore individual online status in UI

                        return (
                            <div key={student.id + '_off'} className="relative group">
                                <button
                                    onClick={() => toggleStatus(student.id, 'present')}
                                    disabled={isManageMode}
                                    className={`
                                        px-3 py-1 rounded-full border transition-all text-sm
                                        ${isPresent
                                            ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold shadow-sm'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-white'
                                        }
                                        ${isManageMode ? 'opacity-70 cursor-default' : ''}
                                    `}
                                >
                                    <StudentNameDisplay student={student} forceGreen={filterTag === '새친구'} />
                                </button>
                                {isManageMode && (
                                    <button
                                        onClick={() => handleRemoveStudent(student.id)}
                                        className="absolute -top-2 -right-1 bg-white text-red-500 rounded-full p-0.5 shadow border border-red-200 hover:bg-red-50 z-10"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {(allowAddStudent || isManageMode) && (
                        <button
                            onClick={openAddModal}
                            className="px-2 py-0.5 rounded border border-dashed border-gray-400 text-gray-400 text-xs hover:border-blue-400 hover:text-blue-500 flex items-center gap-1"
                        >
                            <Plus size={12} /> Add
                        </button>
                    )}
                </div>
            </div>

            {(!students || students.length === 0) && <p className="text-gray-400 text-sm italic mt-2 ml-14">학생이 없습니다.</p>}

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
                        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">
                                {filterTag ? `'${filterTag}' 태그 학생 추가` : `학생 추가 (${classNameStr})`}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex mb-4 bg-gray-100 p-1 rounded">
                                <button
                                    className={`flex-1 py-1 text-sm rounded font-bold transition-colors ${addTab === 'create' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                                    onClick={() => setAddTab('create')}
                                >
                                    새로 만들기
                                </button>
                                <button
                                    className={`flex-1 py-1 text-sm rounded font-bold transition-colors ${addTab === 'select' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                                    onClick={() => setAddTab('select')}
                                >
                                    미배정 선택
                                </button>
                            </div>

                            {addTab === 'create' ? (
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">학생 이름</label>
                                    <input
                                        type="text"
                                        value={newStudentName}
                                        onChange={e => setNewStudentName(e.target.value)}
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                                        placeholder="이름 입력"
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        {filterTag
                                            ? `* 새 학생을 생성하고 '${filterTag}' 태그를 부여합니다.`
                                            : "* 새로운 학생 데이터를 생성하고 이 반에 배정합니다."}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">미배정 명단</label>
                                    {unassignedStudents.length > 0 ? (
                                        <select
                                            value={selectedUnassignedId}
                                            onChange={e => setSelectedUnassignedId(e.target.value)}
                                            className="w-full border p-2 rounded bg-white text-black"
                                        >
                                            <option value="">-- 학생 선택 --</option>
                                            {unassignedStudents.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-gray-400 py-2 border rounded bg-gray-50 text-center">미배정 학생이 없습니다.</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                        {filterTag
                                            ? `* 선택한 학생에게 '${filterTag}' 태그를 추가합니다.`
                                            : "* 반이 없는 기존 학생을 이 반으로 데려옵니다."}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleAddStudent}
                                className="w-full mt-6 bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                            >
                                <UserPlus size={18} />
                                {addTab === 'create' ? '생성 및 추가' : '선택/추가'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
