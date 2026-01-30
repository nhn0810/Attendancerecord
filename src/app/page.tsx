'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { WorshipLog, Class } from '@/types/database';
import Link from 'next/link';

import WorshipInfoForm from '@/components/WorshipInfoForm';
import AttendanceCheck from '@/components/AttendanceCheck';
import OfferingsForm from '@/components/OfferingsForm';
import StaffCheck from '@/components/StaffCheck';
import CouponForm from '@/components/CouponForm';
import ClassManager from '@/components/ClassManager';
import RosterManager from '@/components/RosterManager';
import PaperFormDownload from '@/components/PaperFormDownload';
import OnlineAttendanceForm from '@/components/OnlineAttendanceForm';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'admin'>('attendance');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logData, setLogData] = useState<WorshipLog | null>(null);

  // Dynamic Classes
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    fetchClasses();
  }, [activeTab]);

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*, teachers(name)').order('name');
    setClasses(data || []);
  };

  useEffect(() => {
    fetchLogByDate(selectedDate);
  }, [selectedDate]);

  const fetchLogByDate = async (date: string) => {
    const { data } = await supabase.from('worship_logs').select('*').eq('date', date).single();
    setLogData(data);
  };

  // Group classes
  const middleClasses = classes.filter(c => c.grade === 'Middle');
  const highClasses = classes.filter(c => c.grade === 'High');

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-gray-900">

      {/* Header Section - Full Width Dark Background */}
      <div className="bg-slate-900 text-white py-12 mb-8 shadow-md">
        <div className="max-w-5xl mx-auto px-4">
          <header>
            <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
              <div className="inline-block bg-indigo-600 text-xs font-bold px-3 py-1 rounded-full tracking-wider shadow-sm">
                2026 CHURCH MOTTO
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                오직 성령의 능력으로 <span className="text-lg font-normal opacity-80 block md:inline mt-1 md:mt-0">(고전 2:4-5)</span>
              </h2>
              <p className="text-slate-300 font-medium">백양로교회 다음세대 예배 출석 시스템</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 flex justify-between items-center shadow-lg border border-white/10 max-w-3xl mx-auto">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'attendance'
                      ? 'bg-white text-slate-900 shadow-md transform scale-100'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  예배 및 출석
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'admin'
                      ? 'bg-white text-slate-900 shadow-md transform scale-100'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  관리 (반/명단)
                </button>
              </div>

              <div className="hidden md:flex gap-2">
                <Link href="/history" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:bg-white/20 transition-colors">
                  <span>📅</span> 기록 보기
                </Link>
                <Link href="/stats" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:bg-white/20 transition-colors">
                  <span>📊</span> 통계 확인
                </Link>
              </div>
            </div>
            {/* Mobile Links */}
            <div className="flex justify-center gap-4 mt-4 md:hidden">
              <Link href="/history" className="text-sm font-bold text-slate-200 hover:text-white underline underline-offset-4">
                📅 기록 보기
              </Link>
              <Link href="/stats" className="text-sm font-bold text-slate-200 hover:text-white underline underline-offset-4">
                📊 통계 확인
              </Link>
            </div>
          </header>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        {activeTab === 'admin' ? (
          <div className="space-y-8 animate-fade-in">
            <ClassManager />
            <RosterManager />
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">

            {/* 1. Worship Info */}
            <section>
              <WorshipInfoForm
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                logData={logData}
                onUpdate={() => fetchLogByDate(selectedDate)}
              />
            </section>

            {/* 2. Authentication Check */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-extrabold mb-6 flex items-center gap-2 text-slate-900">
                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-lg">2</span>
                학생 출석 관리
              </h2>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
                  중등부
                </h3>
                <div className="grid gap-3">
                  {middleClasses.map(cls => (
                    <AttendanceCheck key={cls.id} logId={logData?.id || null} classId={cls.id} classNameStr={cls.name} teacherName={cls.teacher_name || cls.teachers?.name} />
                  ))}
                  {middleClasses.length === 0 && <p className="text-gray-500 py-4 text-center bg-slate-50 rounded-xl">중등부 반이 없습니다. 관리 배너에서 추가해주세요.</p>}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
                  고등부
                </h3>
                <div className="grid gap-3">
                  {highClasses.map(cls => (
                    <AttendanceCheck key={cls.id} logId={logData?.id || null} classId={cls.id} classNameStr={cls.name} teacherName={cls.teacher_name || cls.teachers?.name} />
                  ))}
                  {highClasses.length === 0 && <p className="text-gray-500 py-4 text-center bg-slate-50 rounded-xl">고등부 반이 없습니다.</p>}
                </div>
              </div>

              {/* Special Groups */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-green-500 rounded-full inline-block"></span>
                  새친구 (New Friends)
                </h3>
                <div className="space-y-2">
                  <AttendanceCheck
                    logId={logData?.id || null}
                    classNameStr="🌱 새친구 (태그 모음)"
                    filterTag="새친구"
                    allowAddStudent={true}
                  />
                  <p className="text-xs text-slate-600 mt-2 pl-2">
                    * '새친구' 태그가 붙은 모든 학생이 이곳에 표시됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Online Attendance */}
            <section>
              <OnlineAttendanceForm
                logId={logData?.id || null}
                selectedDate={selectedDate}
                onUpdate={() => fetchLogByDate(selectedDate)}
              />
            </section>

            {/* Offerings and Staff - Stacked Vertically */}
            <div className="flex flex-col gap-6">
              <div>
                <OfferingsForm logId={logData?.id || null} />
              </div>
              <div className="space-y-6">
                <StaffCheck logId={logData?.id || null} />
                <CouponForm
                  selectedDate={selectedDate}
                  logData={logData}
                  onUpdate={() => fetchLogByDate(selectedDate)}
                />
              </div>
            </div>

            {/* Image Download Float or Bottom */}
            <div className="py-12 flex justify-center">
              <PaperFormDownload logId={logData?.id || null} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
