'use client';

import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { supabase } from '@/utils/supabase/client';
import { Class, Student, Teacher, Offering, WorshipLog } from '@/types/database';

interface PaperFormProps {
    logId: string | null;
}

export default function PaperFormDownload({ logId }: PaperFormProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    // Data State
    const [logData, setLogData] = useState<WorshipLog | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<{ log_id: string, student_id: string }[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<{ log_id: string, teacher_id: string }[]>([]);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [readyToDownload, setReadyToDownload] = useState(false);

    // Fetch Logic
    const fetchData = async () => {
        if (!logId) return;
        setLoading(true);
        try {
            // Parallel Fetch
            const [
                logRes,
                classRes,
                studentRes,
                attRes,
                teacherRes,
                tAttRes,
                offeringRes
            ] = await Promise.all([
                supabase.from('worship_logs').select('*').eq('id', logId).single(),
                supabase.from('classes').select('*, teachers(name)').order('name'),
                supabase.from('students').select('*').eq('is_active', true),
                supabase.from('attendance').select('log_id, student_id').eq('log_id', logId),
                supabase.from('teachers').select('*').eq('is_active', true),
                supabase.from('teacher_attendance').select('log_id, teacher_id').eq('log_id', logId),
                supabase.from('offerings').select('*').eq('log_id', logId)
            ]);

            setLogData(logRes.data);
            setClasses(classRes.data || []);
            setStudents(studentRes.data || []);
            setAttendance(attRes.data || []);
            setTeachers(teacherRes.data || []);
            setTeacherAttendance(tAttRes.data || []);
            setOfferings(offeringRes.data || []);

            // Allow time for render before capture
            setTimeout(() => setReadyToDownload(true), 500);

        } catch (e) {
            console.error(e);
            alert('데이터 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (readyToDownload && ref.current) {
            // generate
            (async () => {
                try {
                    const dataUrl = await toPng(ref.current!, { cacheBust: true, backgroundColor: 'white', quality: 0.95, pixelRatio: 2 });
                    const link = document.createElement('a');
                    link.download = `예배일지_${logData?.date || 'unknown'}.png`;
                    link.href = dataUrl;
                    link.click();
                } catch (err) {
                    console.error(err);
                    alert('이미지 생성 실패');
                } finally {
                    setReadyToDownload(false); // Reset
                }
            })();
        }
    }, [readyToDownload]);

    const handleDownloadClick = () => {
        if (!logId) {
            alert('저장된 예배 정보가 없습니다.');
            return;
        }
        fetchData(); // This triggers fetch -> state update -> ready -> useEffect -> download
    };


    // Helpers
    const getAttendingStudents = (classId: string) => {
        const classStudents = students.filter(s => s.class_id === classId);
        const attending = classStudents.filter(s => attendance.some(a => a.student_id === s.id));
        return {
            total: classStudents.length,
            count: attending.length,
            names: attending.map(s => s.name).join(', ')
        };
    };

    const middleClasses = classes.filter(c => c.grade === 'Middle');
    const highClasses = classes.filter(c => c.grade === 'High');

    // Calculate totals
    const totalAttendanceCount = attendance.length;
    const totalOffering = offerings.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Teachers
    const attendingTeachers = teachers.filter(t => teacherAttendance.some(ta => ta.teacher_id === t.id));
    const teacherNames = attendingTeachers.map(t => t.name).join(', ');

    return (
        <div>
            <button
                onClick={handleDownloadClick}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-indigo-700 flex items-center gap-2 mx-auto disabled:opacity-50"
            >
                {loading ? '생성 중...' : '📥 JPG 다운로드 (종이 양식)'}
            </button>

            {/* Hidden Container for Generation */}
            {/* We position it absolute off screen but NOT display:none */}
            <div className="absolute top-0 left-[-9999px]">
                {logData && (
                    <div
                        ref={ref}
                        className="w-[800px] bg-white p-12 text-black font-serif border border-gray-300 relative"
                        style={{ minHeight: '1100px' }}
                    >
                        {/* Header */}
                        <div className="text-center mb-8 relative">
                            <h1 className="text-4xl font-extrabold border-2 border-black inline-block px-8 py-2">중 · 고 등 부 &nbsp; 예 배 일 지</h1>
                            <div className="absolute right-0 bottom-0 text-lg font-bold">
                                {logData.date.split('-')[0]}년 {logData.date.split('-')[1]}월 {logData.date.split('-')[2]}일
                            </div>
                        </div>

                        {/* Worship Info Box */}
                        <div className="border-2 border-black mb-6">
                            <div className="flex border-b border-black">
                                <div className="w-24 bg-gray-100 font-bold border-r border-black p-2 text-center flex items-center justify-center">기 도</div>
                                <div className="flex-1 p-2">{logData.prayer || '-'}</div>
                                <div className="w-24 bg-gray-100 font-bold border-l border-r border-black p-2 text-center flex items-center justify-center">말씀제목</div>
                                <div className="flex-1 p-2">{logData.sermon_title || '-'}</div>
                            </div>
                            <div className="flex">
                                <div className="w-24 bg-gray-100 font-bold border-r border-black p-2 text-center flex items-center justify-center">본 문</div>
                                <div className="flex-1 p-2">{logData.sermon_text || '-'}</div>
                                <div className="w-24 bg-gray-100 font-bold border-l border-r border-black p-2 text-center flex items-center justify-center">설교자</div>
                                <div className="flex-1 p-2">{logData.preacher || '-'}</div>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <table className="w-full border-2 border-black mb-6 text-center">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-black">
                                    <th className="border-r border-black p-2 w-16">학년</th>
                                    <th className="border-r border-black p-2 w-24">반</th>
                                    <th className="border-r border-black p-2 w-24">담임</th>
                                    <th className="border-r border-black p-2 w-16">재적</th>
                                    <th className="border-r border-black p-2 w-16">출석</th>
                                    <th className="p-2">명 단 (출석자)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Middle School */}
                                {middleClasses.map((cls, idx) => {
                                    const stats = getAttendingStudents(cls.id);
                                    return (
                                        <tr key={cls.id} className="border-b border-black text-lg h-16">
                                            {idx === 0 && <td rowSpan={middleClasses.length} className="border-r border-black font-bold">중등</td>}
                                            <td className="border-r border-black font-bold">{cls.name.replace('중등부', '')}</td>
                                            <td className="border-r border-black">{cls.teacher_name || cls.teachers?.name || '-'}</td>
                                            <td className="border-r border-black">{stats.total}</td>
                                            <td className="border-r border-black font-bold">{stats.count}</td>
                                            <td className="text-left px-4 tracking-wide text-sm font-medium leading-relaxed">
                                                {stats.names.split(', ').map(n => n && (
                                                    <span key={n} className="inline-block border border-black rounded-full px-2 py-0.5 mr-2 mb-1">{n}</span>
                                                ))}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* High School */}
                                {highClasses.map((cls, idx) => {
                                    const stats = getAttendingStudents(cls.id);
                                    return (
                                        <tr key={cls.id} className="border-b border-black text-lg h-16">
                                            {idx === 0 && <td rowSpan={highClasses.length} className="border-r border-black font-bold">고등</td>}
                                            <td className="border-r border-black font-bold">{cls.name.replace('고등부', '')}</td>
                                            <td className="border-r border-black">{cls.teacher_name || cls.teachers?.name || '-'}</td>
                                            <td className="border-r border-black">{stats.total}</td>
                                            <td className="border-r border-black font-bold">{stats.count}</td>
                                            <td className="text-left px-4 tracking-wide text-sm font-medium leading-relaxed">
                                                {stats.names.split(', ').map(n => n && (
                                                    <span key={n} className="inline-block border border-black rounded-full px-2 py-0.5 mr-2 mb-1">{n}</span>
                                                ))}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Special Groups */}
                                {[...classes.filter(c => c.name === '새친구'), ...classes.filter(c => c.name === '한과영')].map(cls => {
                                    const stats = getAttendingStudents(cls.id);
                                    return (
                                        <tr key={cls.id} className="border-b border-black text-lg h-16 bg-gray-50">
                                            <td colSpan={2} className="border-r border-black font-bold">{cls.name}</td>
                                            <td className="border-r border-black">-</td>
                                            <td className="border-r border-black">{stats.total}</td>
                                            <td className="border-r border-black font-bold">{stats.count}</td>
                                            <td className="text-left px-4 tracking-wide text-sm font-medium leading-relaxed">
                                                {stats.names.split(', ').map(n => n && (
                                                    <span key={n} className="inline-block border border-black rounded-full px-2 py-0.5 mr-2 mb-1">{n}</span>
                                                ))}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Summary Row */}
                                <tr className="bg-gray-100 font-bold h-12">
                                    <td colSpan={4} className="border-r border-black text-right pr-4">합 계</td>
                                    <td className="border-r border-black">{totalAttendanceCount}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Footer Tables */}
                        <div className="flex gap-4">
                            {/* Offerings */}
                            <table className="w-1/2 border-2 border-black text-center">
                                <tbody>
                                    <tr className="border-b border-black bg-gray-100">
                                        <th className="p-2 border-r border-black">헌금 종류</th>
                                        <th className="p-2">금 액</th>
                                    </tr>
                                    {offerings.map(o => (
                                        <tr key={o.type} className="border-b border-black">
                                            <td className="border-r border-black p-2">{o.type}</td>
                                            <td className="p-2 text-right pr-4">{o.amount?.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 font-bold">
                                        <td className="border-r border-black p-2">총 계</td>
                                        <td className="p-2 text-right pr-4">{totalOffering.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Teachers */}
                            <div className="w-1/2 border-2 border-black p-4 flex flex-col justify-center">
                                <h3 className="font-bold border-b border-black mb-2 pb-1 text-center">교사 및 간사 출석 ({attendingTeachers.length}명)</h3>
                                <div className="text-sm leading-6 text-center">
                                    {teacherNames}
                                </div>
                            </div>
                        </div>

                        {/* Timestamp */}
                        <div className="text-right mt-8 text-gray-500 text-xs">
                            출력일시: {new Date().toLocaleString()} / System by Antigravity
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
