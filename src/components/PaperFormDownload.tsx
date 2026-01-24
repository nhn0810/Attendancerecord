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
            names: attending.map(s => s.name)
        };
    };

    const middleClasses = classes.filter(c => c.grade === 'Middle');
    const highClasses = classes.filter(c => c.grade === 'High');

    // Subtotals
    const getSubtotal = (clsList: Class[]) => {
        let reg = 0;
        let att = 0;
        clsList.forEach(c => {
            const stats = getAttendingStudents(c.id);
            reg += stats.total;
            att += stats.count;
        });
        return { reg, att };
    };

    const midSub = getSubtotal(middleClasses);
    const highSub = getSubtotal(highClasses);

    // Special
    const newFriendsClasses = classes.filter(c => c.name === '새친구');
    const newFriendStats = getSubtotal(newFriendsClasses);

    const hgyClasses = classes.filter(c => c.name === '한과영');
    const hgyStats = getSubtotal(hgyClasses);

    // Totals
    const totalReg = midSub.reg + highSub.reg + newFriendStats.reg + hgyStats.reg;
    const totalAtt = midSub.att + highSub.att + newFriendStats.att + hgyStats.att;

    // Offerings
    const offeringTypes = ['주일헌금', '십일조', '감사헌금'];
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
                        className="w-[850px] bg-white p-10 text-black font-sans box-border"
                        style={{ minHeight: '1200px' }}
                    >
                        {/* 1. Header Area with Title and Table */}
                        <div className="mb-6">
                            {/* Title Row */}
                            <div className="flex justify-between items-end mb-2 border-b-2 border-black pb-2">
                                <div className="text-xl font-bold">1. 예배</div>
                                <div className="text-4xl font-black text-center tracking-widest absolute left-1/2 transform -translate-x-1/2 bg-gray-100 border-2 border-black px-8 py-2">
                                    중 · 고등부 예배일지
                                </div>
                                <div className="text-lg font-bold">
                                    {logData.date.split('-')[0]}년 {logData.date.split('-')[1]}월 {logData.date.split('-')[2]}일
                                </div>
                            </div>

                            {/* Header Info Table */}
                            <table className="w-full border-2 border-black text-center text-lg">
                                <tbody>
                                    <tr className="border-b border-black h-12">
                                        <td className="bg-gray-100 font-bold border-r border-black w-24">기 도</td>
                                        <td className="border-r border-black">{logData.prayer || ''}</td>
                                        <td className="bg-gray-100 font-bold border-r border-black w-32">말씀 제목</td>
                                        <td className="text-left px-4">{logData.sermon_title || ''}</td>
                                    </tr>
                                    <tr className="h-12">
                                        <td className="bg-gray-100 font-bold border-r border-black">본 문</td>
                                        <td className="border-r border-black">{logData.sermon_text || ''}</td>
                                        <td className="bg-gray-100 font-bold border-r border-black">설 교 자</td>
                                        <td>{logData.preacher || ''}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 2. Main Table */}
                        <div className="mb-6">
                            <div className="text-xl font-bold mb-1">2. 학생</div>
                            <table className="w-full border-2 border-black text-center border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 h-10 border-b border-black">
                                        <th className="border border-black w-14">학년</th>
                                        <th className="border border-black w-24">반</th>
                                        <th className="border border-black w-20">담임</th>
                                        <th className="border border-black w-14">재적</th>
                                        <th className="border border-black w-14">출석</th>
                                        {/* <th className="border border-black w-14">온라인</th> Ignored */}
                                        <th className="border border-black">명 단</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Middle School */}
                                    {middleClasses.map((cls, idx) => {
                                        const stats = getAttendingStudents(cls.id);
                                        return (
                                            <tr key={cls.id} className="h-14 border border-black">
                                                {idx === 0 && <td rowSpan={middleClasses.length + 1} className="font-bold text-lg border border-black align-middle">중등</td>}
                                                <td className="border border-black font-bold">{cls.name.replace('중등부', '')}</td>
                                                <td className="border border-black">{cls.teacher_name || cls.teachers?.name || ''}</td>
                                                <td className="border border-black">{stats.total}</td>
                                                <td className="border border-black font-bold">{stats.count}</td>
                                                {/* <td className="border border-black">0</td> */}
                                                <td className="text-left px-2 py-1 align-middle leading-snug">
                                                    {stats.names.map(n => (
                                                        <span key={n} style={{ border: '1px solid black', borderRadius: '50%', padding: '2px 6px', margin: '2px', display: 'inline-block', fontSize: '14px' }}>{n}</span>
                                                    ))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Middle Subtotal */}
                                    <tr className="bg-gray-50 h-10 border border-black font-bold">
                                        <td colSpan={2} className="border border-black">소 계</td>
                                        <td className="border border-black">{midSub.reg}</td>
                                        <td className="border border-black">{midSub.att}</td>
                                        <td className="border border-black bg-gray-100 text-gray-400 diagonal-line"></td>
                                    </tr>

                                    {/* High School */}
                                    {highClasses.map((cls, idx) => {
                                        const stats = getAttendingStudents(cls.id);
                                        return (
                                            <tr key={cls.id} className="h-14 border border-black">
                                                {idx === 0 && <td rowSpan={highClasses.length + 1} className="font-bold text-lg border border-black align-middle">고등</td>}
                                                <td className="border border-black font-bold">{cls.name.replace('고등부', '')}</td>
                                                <td className="border border-black">{cls.teacher_name || cls.teachers?.name || ''}</td>
                                                <td className="border border-black">{stats.total}</td>
                                                <td className="border border-black font-bold">{stats.count}</td>
                                                <td className="text-left px-2 py-1 align-middle leading-snug">
                                                    {stats.names.map(n => (
                                                        <span key={n} style={{ border: '1px solid black', borderRadius: '50%', padding: '2px 6px', margin: '2px', display: 'inline-block', fontSize: '14px' }}>{n}</span>
                                                    ))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* High Subtotal */}
                                    <tr className="bg-gray-50 h-10 border border-black font-bold">
                                        <td colSpan={2} className="border border-black">소 계</td>
                                        <td className="border border-black">{highSub.reg}</td>
                                        <td className="border border-black">{highSub.att}</td>
                                        <td className="border border-black bg-gray-100 text-gray-400"></td>
                                    </tr>

                                    {/* Special: New Friends */}
                                    <tr className="h-12 border border-black">
                                        <td rowSpan={2} className="font-bold border border-black bg-gray-50">기타</td>
                                        <td className="border border-black font-bold">새친구</td>
                                        <td className="border border-black">-</td>
                                        <td className="border border-black">{newFriendStats.reg}</td>
                                        <td className="border border-black font-bold">{newFriendStats.att}</td>
                                        <td className="text-left px-2 py-1 align-middle">
                                            {newFriendsClasses.map(c => getAttendingStudents(c.id).names.map(n => (
                                                <span key={n} style={{ border: '1px solid black', borderRadius: '50%', padding: '2px 6px', margin: '2px', display: 'inline-block', fontSize: '14px' }}>{n}</span>
                                            )))}
                                        </td>
                                    </tr>
                                    {/* Special: HanGwaYoung */}
                                    <tr className="h-12 border border-black">
                                        <td className="border border-black font-bold">한과영</td>
                                        <td className="border border-black">-</td>
                                        <td className="border border-black">{hgyStats.reg}</td>
                                        <td className="border border-black font-bold">{hgyStats.att}</td>
                                        <td className="text-left px-2 py-1 align-middle">
                                            {hgyClasses.map(c => getAttendingStudents(c.id).names.map(n => (
                                                <span key={n} style={{ border: '1px solid black', borderRadius: '50%', padding: '2px 6px', margin: '2px', display: 'inline-block', fontSize: '14px' }}>{n}</span>
                                            )))}
                                        </td>
                                    </tr>

                                    {/* Grand Total */}
                                    <tr className="h-12 border-2 border-black font-bold bg-gray-200 text-lg">
                                        <td colSpan={3} className="border border-black">합 계</td>
                                        <td className="border border-black">{totalReg}</td>
                                        <td className="border border-black text-xl">{totalAtt}</td>
                                        <td className="border border-black text-right pr-4 text-sm font-normal pt-3">
                                            (현장: {totalAtt})
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 3. Offerings & 4. Staff */}
                        <div className="flex gap-4">
                            {/* 3. Offerings */}
                            <div className="w-1/2">
                                <div className="text-xl font-bold mb-1">3. 헌금</div>
                                <table className="w-full border-2 border-black text-center h-full">
                                    <thead>
                                        <tr className="bg-gray-100 h-10 border-b border-black">
                                            {offeringTypes.map(t => (
                                                <th key={t} className="border border-black">{t}</th>
                                            ))}
                                            <th className="border border-black">기타</th>
                                            <th className="border border-black">합계</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="h-16 font-bold text-lg">
                                            {offeringTypes.map(t => {
                                                const val = offerings.find(o => o.type === t)?.amount || 0;
                                                return <td key={t} className="border border-black">{val ? val.toLocaleString() : ''}</td>
                                            })}
                                            <td className="border border-black">
                                                {offerings.filter(o => !offeringTypes.includes(o.type)).reduce((acc, cur) => acc + (cur.amount || 0), 0).toLocaleString()}
                                            </td>
                                            <td className="border border-black bg-gray-50">{totalOffering.toLocaleString()}</td>
                                        </tr>
                                        <tr className="h-8 border-t border-black">
                                            <td colSpan={5} className="text-left px-2 text-sm italic">
                                                {/* Optional notes */}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 4. Staff */}
                            <div className="w-1/2">
                                <div className="text-xl font-bold mb-1">4. 교사 및 간사 출석</div>
                                <div className="border-2 border-black h-[110px] p-4 flex flex-col items-center justify-center bg-white relative">
                                    <div className="text-center font-bold mb-2 text-lg">
                                        총 {attendingTeachers.length} 명
                                    </div>
                                    <div className="text-center text-sm leading-relaxed px-4 break-keep">
                                        {teacherNames}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timestamp Footer */}
                        <div className="text-right mt-6 text-gray-400 text-xs">
                            System by Antigravity | Printed: {new Date().toLocaleString()}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
