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
    const [attendance, setAttendance] = useState<{ log_id: string, student_id: string }[]>([]);
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
    const getAttendingStudents = (classId: string) => {
        const classStudents = students.filter(s => s.class_id === classId);
        const attending = classStudents.filter(s => attendance.some(a => a.student_id === s.id));
        return { total: classStudents.length, count: attending.length, names: attending.map(s => s.name) };
    };

    const middleClasses = classes.filter(c => c.grade === 'Middle');
    const highClasses = classes.filter(c => c.grade === 'High');

    // Subtotals
    const getSubtotal = (clsList: Class[]) => {
        let reg = 0; let att = 0;
        clsList.forEach(c => { const stats = getAttendingStudents(c.id); reg += stats.total; att += stats.count; });
        return { reg, att };
    };

    const midSub = getSubtotal(middleClasses);
    const highSub = getSubtotal(highClasses);

    // Special
    const newFriendsClasses = classes.filter(c => c.name === '새친구');
    const newFriendStats = getSubtotal(newFriendsClasses);
    const hgyClasses = classes.filter(c => c.name === '한과영');
    const hgyStats = getSubtotal(hgyClasses);

    // Grand Total
    const totalReg = midSub.reg + highSub.reg + newFriendStats.reg + hgyStats.reg;
    const totalAtt = midSub.att + highSub.att + newFriendStats.att + hgyStats.att;

    // Offerings
    const getOffering = (type: string) => offerings.find(o => o.type === type)?.amount || null;
    const offeringTypes = ['주일헌금', '십일조', '감사헌금'];
    const totalOffering = offerings.reduce((sum, o) => sum + (o.amount || 0), 0);
    const otherOfferings = offerings.filter(o => !offeringTypes.includes(o.type)).reduce((sum, o) => sum + (o.amount || 0), 0);
    const otherOfferingVal = otherOfferings > 0 ? otherOfferings : null;

    // Teachers
    const attendingTeachers = teachers.filter(t => teacherAttendance.some(ta => ta.teacher_id === t.id));
    const teacherStaff = attendingTeachers.filter(t => t.role === 'Teacher');
    const staffStaff = attendingTeachers.filter(t => t.role === 'Staff');

    // CSS Styles (Injected)
    const styles = `
        .container { width: 794px; min-height: 1123px; margin: 0 auto; border: 2px solid #000; padding: 20px; font-family: "Malgun Gothic", sans-serif; color: #333; background: white; box-sizing: border-box; }
        h1 { text-align: center; font-size: 24px; border: 1px solid #000; display: inline-block; padding: 5px 20px; margin: 0 auto 10px auto; }
        .header-box { text-align: center; margin-bottom: 10px; }
        .date { text-align: right; font-size: 14px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; }
        .section-title { font-weight: bold; margin-bottom: 5px; display: block; }
        .total-row { background-color: #f9f9f9; font-weight: bold; }
        .input-line { border-bottom: 1px solid #000; display: inline-block; min-width: 40px; text-align: center; padding: 0 5px; }
        .circle-name { border: 1px solid #000; border-radius: 50%; padding: 2px 6px; margin: 2px; display: inline-block; font-size: 11px; }
    `;

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
                                        <th width="15%">기 도</th>
                                        <th width="40%">말 씀 제 목</th>
                                        <th width="30%">본 문</th>
                                        <th width="15%">설 교 자</th>
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
                                        <th width="8%">학 년</th>
                                        <th width="10%">담 임</th>
                                        <th width="7%">재적</th>
                                        <th width="7%">현장<br />출석</th>
                                        <th width="7%">온라인<br />출석</th>
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
                                                <td>{stats.count}</td>
                                                <td></td>
                                                <td style={{ textAlign: 'left' }}>
                                                    {stats.names.map(n => <span key={n} className="circle-name">{n}</span>)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="total-row">
                                        <td colSpan={2}>소계</td>
                                        <td>{midSub.reg}</td>
                                        <td>{midSub.att}</td>
                                        <td></td>
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
                                                <td>{stats.count}</td>
                                                <td></td>
                                                <td style={{ textAlign: 'left' }}>
                                                    {stats.names.map(n => <span key={n} className="circle-name">{n}</span>)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="total-row">
                                        <td colSpan={2}>소계</td>
                                        <td>{highSub.reg}</td>
                                        <td>{highSub.att}</td>
                                        <td></td>
                                        <td></td>
                                    </tr>

                                    {/* Special */}
                                    <tr>
                                        <td colSpan={2}>새친구</td>
                                        <td>{newFriendStats.reg}</td>
                                        <td>{newFriendStats.att}</td>
                                        <td></td>
                                        <td style={{ textAlign: 'left' }}>
                                            {newFriendsClasses.map(c => getAttendingStudents(c.id).names.map(n => <span key={n} className="circle-name">{n}</span>))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2}>한과영</td>
                                        <td>{hgyStats.reg}</td>
                                        <td>{hgyStats.att}</td>
                                        <td></td>
                                        <td style={{ textAlign: 'left' }}>
                                            {hgyClasses.map(c => getAttendingStudents(c.id).names.map(n => <span key={n} className="circle-name">{n}</span>))}
                                        </td>
                                    </tr>

                                    <tr className="total-row" style={{ backgroundColor: '#eee' }}>
                                        <td colSpan={2}>합계</td>
                                        <td>{totalReg}</td>
                                        <td>{totalAtt}</td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>

                            <span className="section-title">3. 헌금</span>
                            <table>
                                <tbody>
                                    <tr>
                                        <th width="10%"></th>
                                        <th width="18%">주일헌금</th>
                                        <th width="18%">십일조</th>
                                        <th width="18%">감사헌금</th>
                                        <th width="18%">헌금</th>
                                        <th width="18%">합계</th>
                                    </tr>
                                    <tr style={{ height: '35px' }}>
                                        <th>금액</th>
                                        <td>{getOffering('주일헌금')?.toLocaleString()}</td>
                                        <td>{getOffering('십일조')?.toLocaleString()}</td>
                                        <td>{getOffering('감사헌금')?.toLocaleString()}</td>
                                        <td>{otherOfferingVal?.toLocaleString()}</td>
                                        <td>{totalOffering.toLocaleString()}</td>
                                    </tr>
                                    <tr style={{ height: '45px' }}>
                                        <th>명단</th>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ fontSize: '13px', lineHeight: '2.5', border: '1px solid #000', padding: '15px' }}>
                                <strong>4. 청년교사 : </strong> <span className="input-line">{teacherStaff.length}</span> 명 &nbsp;&nbsp;
                                <strong>청년간사 : </strong> <span className="input-line">{staffStaff.length}</span> 명 &nbsp;&nbsp;
                                <strong>합계 : </strong> <span className="input-line">{attendingTeachers.length}</span> 명<br />
                                <strong>청년교사 : </strong> <span style={{ textDecoration: 'underline' }}>{teacherStaff.map(t => t.name).join(', ')}</span><br />
                                <strong>청년간사 : </strong> <span style={{ textDecoration: 'underline' }}>{staffStaff.map(t => t.name).join(', ')}</span><br />
                                <strong>만나쿠폰 발급내역 : 1천원권 </strong> <span className="input-line">{Number(logData.coupons_per_person || 0) * Number(logData.coupon_recipient_count || 0)}</span> 개 ( <span className="input-line">{logData.coupon_recipient_count || 0}</span> 명 )
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
