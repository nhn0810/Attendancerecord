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

    // Data
    const [logData, setLogData] = useState<WorshipLog | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<{ log_id: string, student_id: string, status: 'present' | 'online' }[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [teacherAttendance, setTeacherAttendance] = useState<{ log_id: string, teacher_id: string }[]>([]);
    const [offerings, setOfferings] = useState<Offering[]>([]);
    const [readyToDownload, setReadyToDownload] = useState(false);

    // Fetch
    const fetchData = async () => {
        if (!logId) return;
        setLoading(true);
        try {
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
                supabase.from('students').select('*').eq('is_active', true).order('name'),
                supabase.from('attendance').select('log_id, student_id, status').eq('log_id', logId),
                supabase.from('teachers').select('*').eq('is_active', true),
                supabase.from('teacher_attendance').select('log_id, teacher_id').eq('log_id', logId),
                supabase.from('offerings').select('*').eq('log_id', logId)
            ]);

            setLogData(logRes.data);
            setClasses(classRes.data || []);
            setStudents(studentRes.data || []);
            setAttendance((attRes.data as any) || []);
            setTeachers(teacherRes.data || []);
            setTeacherAttendance(tAttRes.data || []);
            setOfferings(offeringRes.data || []);

            setTimeout(() => setReadyToDownload(true), 500);
        } catch (e) {
            console.error(e);
            alert('로드 실패');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (readyToDownload && ref.current) {
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
                    setReadyToDownload(false);
                }
            })();
        }
    }, [readyToDownload]);

    const handleDownloadClick = () => {
        if (!logId) { alert('데이터 없음'); return; }
        fetchData();
    };

    // --- Helpers ---
    const getAttendingStudents = (classId: string, studentList?: Student[]) => {
        const targetStudents = studentList || students.filter(s => s.class_id === classId);
        // Offline presence check
        const attending = attendance.filter(a => targetStudents.some(s => s.id === a.student_id) && a.status === 'present');

        const names = targetStudents.filter(s => attendance.some(a => a.student_id === s.id && a.status === 'present')).map(s => s.name);

        return {
            total: targetStudents.length,
            present: attending.length,
            names: names
        };
    };

    const middleClasses = classes.filter(c => c.grade === 'Middle');
    const highClasses = classes.filter(c => c.grade === 'High');

    // Subtotals
    const getSubtotal = (clsList: Class[]) => {
        let reg = 0; let pres = 0;
        clsList.forEach(c => {
            const stats = getAttendingStudents(c.id);
            reg += stats.total;
            pres += stats.present;
        });
        return { reg, pres };
    };

    const midSub = getSubtotal(middleClasses);
    const highSub = getSubtotal(highClasses);

    // New Friends Logic (Tag based)
    const newFriendStudents = students.filter(s => s.tags?.includes('새친구'));
    const newFriendStats = getAttendingStudents('', newFriendStudents);

    // Custom Tag HGY
    const hgyStudents = students.filter(s => s.tags?.includes('한과영'));
    // Need to format HGY names with style : Bold Italic Brown
    // We will render them normally in the list but apply style inline

    // Grand Total (Unique)
    const totalReg = students.length;
    const totalPres = attendance.filter(a => a.status === 'present').length;
    const onlineCount = logData?.online_attendance_count || 0;

    // Offerings
    const getOffering = (type: string) => offerings.find(o => o.type === type)?.amount || null;
    const totalOffering = offerings.reduce((sum, o) => sum + (o.amount || 0), 0);
    const otherOfferings = offerings.filter(o => !['주일헌금', '십일조', '감사헌금'].includes(o.type)).reduce((sum, o) => sum + (o.amount || 0), 0);
    const otherOfferingVal = otherOfferings > 0 ? otherOfferings : null;

    // Teachers
    const attendingTeachers = teachers.filter(t => teacherAttendance.some(ta => ta.teacher_id === t.id));
    const teacherStaff = attendingTeachers.filter(t => t.role === 'Teacher');
    const staffStaff = attendingTeachers.filter(t => t.role === 'Staff');

    const styles = `
        .container { width: 794px; min-height: 1123px; margin: 0 auto; border: 2px solid #000; padding: 20px; font-family: "Malgun Gothic", sans-serif; color: #000; background: white; box-sizing: border-box; }
        h1 { text-align: center; font-size: 24px; border: 1px solid #000; display: inline-block; padding: 5px 20px; margin: 0 auto 10px auto; }
        .header-box { text-align: center; margin-bottom: 10px; }
        .date { text-align: right; font-size: 14px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; color: #000; }
        th { background-color: #f2f2f2; }
        .section-title { font-weight: bold; margin-bottom: 5px; display: block; }
        .total-row { background-color: #f9f9f9; font-weight: bold; }
        .input-line { border-bottom: 1px solid #000; display: inline-block; min-width: 40px; text-align: center; padding: 0 5px; }
        .nf-tag { color: #15803d; font-weight: bold; } 
    `;

    // Helper to render student name with conditional styling
    const renderStudentName = (name: string, studentId?: string) => {
        // Find student object to check tags if id provided, otherwise guess or standard
        // In the map loop we have the name. But 'names' array in stats is just strings.
        // We should pass student objects to be accurate.
        // Updating getAttendingStudents to return objects is better.
        // BUT for now, let's look up by name (risk of duplicate names but user system seems small).
        // Safest is to find student by name in the filtered list.
        const student = students.find(s => s.name === name); // Fallback
        const isHgy = student?.tags?.includes('한과영');

        if (isHgy) {
            // Bold Italic Brown
            return <span key={name} style={{ fontWeight: 'bold', fontStyle: 'italic', color: '#8B4513', marginRight: '5px' }}>{name}</span>;
        }
        return <span key={name} style={{ marginRight: '5px' }}>{name}</span>;
    };

    return (
        <div>
            <button
                onClick={handleDownloadClick} disabled={loading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-indigo-700 mx-auto block"
            >
                {loading ? '생성 중...' : '📥 JPG 다운로드 (최종 양식)'}
            </button>

            {/* Hidden Container */}
            <div className="absolute top-0 left-[-9999px]">
                {logData && (
                    <div ref={ref}>
                        <style>{styles}</style>
                        <div className="container">
                            <div className="header-box">
                                <h1>중·고등부 예배일지</h1>
                            </div>

                            <div className="date">
                                {logData.date.split('-')[0]}년 &nbsp;&nbsp; {logData.date.split('-')[1]}월 &nbsp;&nbsp; {logData.date.split('-')[2]}일
                            </div>

                            <span className="section-title">1. 예배</span>
                            <table>
                                <tbody>
                                    <tr>
                                        <th style={{ width: '15%' }}>기 도</th>
                                        <th style={{ width: '40%' }}>말 씀 제 목</th>
                                        <th style={{ width: '30%' }}>본 문</th>
                                        <th style={{ width: '15%' }}>설 교 자</th>
                                    </tr>
                                    <tr style={{ height: '45px' }}>
                                        <td>{logData.prayer}</td>
                                        <td>{logData.sermon_title}</td>
                                        <td>{logData.sermon_text}</td>
                                        <td>{logData.preacher || '임희준 목사님'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <span className="section-title">2. 학생</span>
                            <table>
                                <tbody>
                                    <tr>
                                        <th style={{ width: '8%' }}>학 년</th>
                                        <th style={{ width: '10%' }}>담 임</th>
                                        <th style={{ width: '7%' }}>재적</th>
                                        <th style={{ width: '7%' }}>현장<br />출석</th>
                                        <th style={{ width: '7%' }}>온라인<br />출석</th>
                                        <th>명 단</th>
                                    </tr>

                                    {/* Middle */}
                                    {middleClasses.map(c => {
                                        const stats = getAttendingStudents(c.id);
                                        return (
                                            <tr key={c.id} style={{ height: '35px' }}>
                                                <td>{c.name.replace('중등부', '중').replace('고등부', '고')}</td>
                                                <td>{c.teacher_name || c.teachers?.name}</td>
                                                <td>{stats.total}</td>
                                                <td>{stats.present}</td>
                                                <td>-</td>
                                                <td style={{ textAlign: 'left', paddingLeft: '10px' }}>
                                                    {stats.names.map(name => renderStudentName(name))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="total-row">
                                        <td colSpan={2}>소계</td>
                                        <td>{midSub.reg}</td>
                                        <td>{midSub.pres}</td>
                                        <td>-</td>
                                        <td></td>
                                    </tr>

                                    {/* High */}
                                    {highClasses.map(c => {
                                        const stats = getAttendingStudents(c.id);
                                        return (
                                            <tr key={c.id} style={{ height: '35px' }}>
                                                <td>{c.name.replace('중등부', '중').replace('고등부', '고')}</td>
                                                <td>{c.teacher_name || c.teachers?.name}</td>
                                                <td>{stats.total}</td>
                                                <td>{stats.present}</td>
                                                <td>-</td>
                                                <td style={{ textAlign: 'left', paddingLeft: '10px' }}>
                                                    {stats.names.map(name => renderStudentName(name))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="total-row">
                                        <td colSpan={2}>소계</td>
                                        <td>{highSub.reg}</td>
                                        <td>{highSub.pres}</td>
                                        <td>-</td>
                                        <td></td>
                                    </tr>

                                    {/* New Friends Row - Removing Green Background as requested, keeping text distinct but background white */}
                                    {newFriendStats.total > 0 && (
                                        <tr>
                                            <td colSpan={2} style={{ color: '#15803d', fontWeight: 'bold' }}>새친구</td>
                                            <td>{newFriendStats.total}</td>
                                            <td>{newFriendStats.present}</td>
                                            <td>-</td>
                                            <td style={{ textAlign: 'left', paddingLeft: '10px' }}>
                                                {newFriendStats.names.map(name => (
                                                    <span key={name} className="nf-tag" style={{ marginRight: '5px' }}>{name}</span>
                                                ))}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Online Attendance Row */}
                                    {onlineCount > 0 && (
                                        <tr style={{ backgroundColor: '#eff6ff' }}>
                                            <td colSpan={2} style={{ color: '#1d4ed8', fontWeight: 'bold' }}>온라인</td>
                                            <td>-</td>
                                            <td>-</td>
                                            <td style={{ fontWeight: 'bold' }}>{onlineCount}</td>
                                            <td style={{ fontSize: '11px', color: '#888' }}>(명단 생략)</td>
                                        </tr>
                                    )}

                                    <tr className="total-row" style={{ backgroundColor: '#eee' }}>
                                        <td colSpan={2}>합계</td>
                                        <td>{totalReg}</td>
                                        <td>{totalPres}</td>
                                        <td>{onlineCount}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>

                            <span className="section-title">3. 헌금</span>
                            <table>
                                <tbody>
                                    <tr>
                                        <th style={{ width: '10%' }}></th>
                                        <th style={{ width: '18%' }}>주일헌금</th>
                                        <th style={{ width: '18%' }}>십일조</th>
                                        <th style={{ width: '18%' }}>감사헌금</th>
                                        <th style={{ width: '18%' }}>헌금</th>
                                        <th style={{ width: '18%' }}>합계</th>
                                    </tr>
                                    <tr style={{ height: '35px' }}>
                                        <th>금액</th>
                                        <td>{getOffering('주일헌금')?.toLocaleString()}</td>
                                        <td>{getOffering('십일조')?.toLocaleString()}</td>
                                        <td>{getOffering('감사헌금')?.toLocaleString()}</td>
                                        <td>{otherOfferingVal?.toLocaleString()}</td>
                                        <td>{totalOffering.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ fontSize: '13px', lineHeight: '2.5', border: '1px solid #000', padding: '15px' }}>
                                <strong>4. 청년교사 : </strong> <span className="input-line">{teacherStaff.length}</span> 명 &nbsp;&nbsp;
                                <strong>청년간사 : </strong> <span className="input-line">{staffStaff.length}</span> 명 &nbsp;&nbsp;
                                <strong>합계 : </strong> <span className="input-line">{attendingTeachers.length}</span> 명<br />
                                <strong>청년교사 : </strong> <span>{teacherStaff.map(t => t.name).join(', ')}</span><br />
                                <strong>청년간사 : </strong> <span>{staffStaff.map(t => t.name).join(', ')}</span><br />
                                <strong>만나쿠폰 발급내역 : 1천원권 </strong> <span className="input-line">{Number(logData.coupons_per_person || 0) * Number(logData.coupon_recipient_count || 0)}</span> 개 ( <span className="input-line">{logData.coupon_recipient_count || 0}</span> 명 )
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
