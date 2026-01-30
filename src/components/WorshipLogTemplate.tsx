
import React, { forwardRef } from 'react';
import type { Student, WorshipLog, Offering, Teacher, Class } from '@/types/database';

interface WorshipLogTemplateProps {
    log: WorshipLog | null;
    date: string;
    classes: Class[];
    students: Student[]; // All active students
    attendance: Set<string>; // Set of present student IDs
    offerings: Offering[];
    teachers: Teacher[];
}

const WorshipLogTemplate = forwardRef<HTMLDivElement, WorshipLogTemplateProps>(
    ({ log, date, classes, students, attendance, offerings, teachers }, ref) => {

        const countPresent = (studentList: Student[]) => studentList.filter(s => attendance.has(s.id)).length;

        // Sort classes: Middle first, then High. Sort by name within grade.
        const sortedClasses = [...classes].sort((a, b) => {
            if (a.grade !== b.grade) return a.grade === 'Middle' ? -1 : 1; // Middle first
            return a.name.localeCompare(b.name);
        });

        // Helper to get students for a specific class
        const getStudentsForClass = (classId: string) => students.filter(s => s.class_id === classId);

        // Sum offerings
        const offeringMap: Record<string, number> = {};
        offerings.forEach(o => {
            offeringMap[o.type] = (offeringMap[o.type] || 0) + (o.amount || 0);
        });
        const totalOffering = Object.values(offeringMap).reduce((a, b) => a + b, 0);

        // Coupon logic
        const totalCouponAmount = (log?.coupon_recipient_count || 0) * (log?.coupons_per_person || 0) * 1000;

        return (
            <div ref={ref} className="bg-white p-8 w-[210mm] min-h-[297mm] text-black font-sans box-border relative">
                {/* Header */}
                <h1 className="text-3xl font-bold text-center mb-4 border-2 border-black inline-block px-4 py-2 relative left-1/2 -translate-x-1/2">
                    중·고등부 예배일지
                </h1>
                <div className="absolute top-8 right-8 text-right">
                    <span className="text-xl">{date}</span>
                </div>

                {/* 1. Worship Info */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-1">1. 예배</h2>
                    <table className="w-full border-2 border-black text-center border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-black bg-gray-100 p-2 w-1/4">기도</th>
                                <th className="border border-black bg-gray-100 p-2 w-1/4">말씀제목</th>
                                <th className="border border-black bg-gray-100 p-2 w-1/4">본문</th>
                                <th className="border border-black bg-gray-100 p-2 w-1/4">설교자</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 h-12">
                                    {log?.prayer} <span className="text-sm text-gray-600">({log?.prayer_role})</span>
                                </td>
                                <td className="border border-black p-2">{log?.sermon_title}</td>
                                <td className="border border-black p-2">{log?.sermon_text}</td>
                                <td className="border border-black p-2">{log?.preacher}</td>
                            </tr>
                        </tbody>
                    </table>
                    {/* Coupon Info Row */}
                    <div className="text-right mt-1 text-sm font-bold">
                        쿠폰 지급: {log?.coupon_recipient_count || 0}명 × {log?.coupons_per_person || 0}개 = {totalCouponAmount.toLocaleString()}원
                    </div>
                </div>

                {/* 2. Students */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-1">2. 학생</h2>
                    <table className="w-full border-2 border-black text-center border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 w-16">구분</th>
                                <th className="border border-black p-1 w-20">반 이름</th>
                                <th className="border border-black p-1 w-10">재적</th>
                                <th className="border border-black p-1 w-10">출석</th>
                                <th className="border border-black p-1">명단</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedClasses.map(cls => {
                                const classStudents = getStudentsForClass(cls.id);
                                return (
                                    <tr key={cls.id}>
                                        <td className="border border-black p-1">{cls.grade === 'Middle' ? '중등부' : '고등부'}</td>
                                        <td className="border border-black p-1">{cls.name}</td>
                                        <td className="border border-black p-1">{classStudents.length}</td>
                                        <td className="border border-black p-1">{countPresent(classStudents)}</td>
                                        <td className="border border-black p-1 text-left break-keep text-xs">
                                            {classStudents.map(s => (
                                                <span key={s.id} className={`inline-block mr-2 mb-1 relative`}>
                                                    {attendance.has(s.id) && (
                                                        <span className="absolute -top-[2px] -left-[2px] w-[calc(100%+4px)] h-[calc(100%+4px)] border border-red-500 rounded-full"></span>
                                                    )}
                                                    {s.name}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* New Friends Row */}
                            {(() => {
                                const newFriends = students.filter(s => s.tags?.includes('새친구'));
                                if (newFriends.length > 0) {
                                    return (
                                        <tr className="bg-green-50">
                                            <td className="border border-black p-1 font-bold text-green-700">새친구</td>
                                            <td className="border border-black p-1 text-green-700">-</td>
                                            <td className="border border-black p-1">{newFriends.length}</td>
                                            <td className="border border-black p-1">{countPresent(newFriends)}</td>
                                            <td className="border border-black p-1 text-left break-keep text-xs">
                                                {newFriends.map(s => (
                                                    <span key={s.id + '_nf'} className={`inline-block mr-2 mb-1 relative`}>
                                                        {attendance.has(s.id) && (
                                                            <span className="absolute -top-[2px] -left-[2px] w-[calc(100%+4px)] h-[calc(100%+4px)] border border-red-500 rounded-full"></span>
                                                        )}
                                                        <span className="font-bold text-green-700">{s.name}</span>
                                                    </span>
                                                ))}
                                            </td>
                                        </tr>
                                    );
                                }
                                return null;
                            })()}

                            {/* Online Attendance Row */}
                            {(log?.online_attendance_count || 0) > 0 && (
                                <tr className="bg-blue-50">
                                    <td className="border border-black p-1 font-bold text-blue-700">온라인</td>
                                    <td className="border border-black p-1 text-blue-700">-</td>
                                    <td className="border border-black p-1">-</td>
                                    <td className="border border-black p-1 font-bold">{log?.online_attendance_count}</td>
                                    <td className="border border-black p-1 text-xs text-gray-500 text-center">
                                        (명단 생략)
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 3. Offering */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-1">3. 헌금</h2>
                    <table className="w-full border-2 border-black text-center border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2">주일헌금</th>
                                <th className="border border-black p-2">십일조</th>
                                <th className="border border-black p-2">감사헌금</th>
                                <th className="border border-black p-2">합계</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-black p-2">{(offeringMap['주일헌금'] || 0).toLocaleString()}</td>
                                <td className="border border-black p-2">{(offeringMap['십일조'] || 0).toLocaleString()}</td>
                                <td className="border border-black p-2">{(offeringMap['감사헌금'] || 0).toLocaleString()}</td>
                                <td className="border border-black p-2 font-bold">{totalOffering.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
);

WorshipLogTemplate.displayName = 'WorshipLogTemplate';

export default WorshipLogTemplate;
