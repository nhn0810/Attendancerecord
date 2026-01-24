
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'admin'>('attendance');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logData, setLogData] = useState<WorshipLog | null>(null);

  // Dynamic Classes
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    fetchClasses();
  }, [activeTab]); // Refresh when switching tabs

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
    <main className="min-h-screen bg-gray-100 p-2 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">중·고등부 예배일지</h1>

          <div className="flex gap-2">
            <Link href="/history" className="bg-white px-3 py-2 rounded shadow-sm text-sm font-bold text-indigo-700 border hover:bg-indigo-50">
              📅 기록 보기
            </Link>
            <Link href="/stats" className="bg-white px-3 py-2 rounded shadow-sm text-sm font-bold text-indigo-700 border hover:bg-indigo-50">
              📊 통계/개근
            </Link>
          </div>
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'attendance' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              예배/출석
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-md transition-colors ${activeTab === 'admin' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              반/명단 관리
            </button>
          </div>
        </header>

        {activeTab === 'admin' ? (
          <div className="space-y-8 animate-fade-in">
            <ClassManager />
            <RosterManager />
          </div>
        ) : (
          <div className="animate-fade-in">
            <WorshipInfoForm
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              logData={logData}
              onUpdate={() => fetchLogByDate(selectedDate)}
            />

            {/* Attendance Section */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <h2 className="text-xl font-bold mb-4">2. 학생 출석 관리</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-3">중등부</h3>
                <div className="space-y-2">
                  {middleClasses.map(cls => (
                    <AttendanceCheck key={cls.id} logId={logData?.id || null} classId={cls.id} classNameStr={cls.name} teacherName={cls.teacher_name || cls.teachers?.name} />
                  ))}
                  {middleClasses.length === 0 && <p className="text-gray-400">등록된 반이 없습니다. '반/명단 관리' 탭에서 반을 추가해주세요.</p>}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-3">고등부</h3>
                <div className="space-y-2">
                  {highClasses.map(cls => (
                    <AttendanceCheck key={cls.id} logId={logData?.id || null} classId={cls.id} classNameStr={cls.name} teacherName={cls.teacher_name || cls.teachers?.name} />
                  ))}
                  {highClasses.length === 0 && <p className="text-gray-400">등록된 반이 없습니다.</p>}
                </div>
              </div>
            </div>

            <OfferingsForm logId={logData?.id || null} />
            <StaffCheck logId={logData?.id || null} />
            <CouponForm
              selectedDate={selectedDate}
              logData={logData}
              onUpdate={() => fetchLogByDate(selectedDate)}
            />

            {/* Note: Export function needs refactoring but keeping button logic simple for MVP */}
            <div className="text-center text-gray-500 text-sm mt-8 pb-8">
              * 이미지 다운로드는 상단 '예배 정보 입력' 완료 후 가능합니다.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
