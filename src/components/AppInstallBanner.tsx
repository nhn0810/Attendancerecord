'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AppInstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [osTab, setOsTab] = useState<'AOS' | 'IOS'>('AOS');

    useEffect(() => {
        // Detect if the app is already installed PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone === true);

        // Show banner only if it's NOT a standalone app
        if (!isStandalone) {
            setShowBanner(true);
        }

        // Optional: Also check user agent to detect OS and set default tab
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setOsTab('IOS');
        }
    }, []);

    if (!showBanner) return null;

    const androidSteps = [
        { text: '크롬으로 접속하여 상단의 메뉴버튼을 눌러주세요', img: '/images/AOS1.jpg' },
        { text: '드롭다운 메뉴에서 "홈 화면에 추가" 버튼을 눌러주세요', img: '/images/AOS2.jpg' },
        { text: '이후 설치버튼을 누르면 배경화면에 어플리케이션이 설치됩니다', img: '/images/AOS3.jpg' },
    ];

    const iosSteps = [
        { text: '사파리로 접속하여 하단의 공유하기 버튼을 눌러주세요', img: '/images/IOS1.png' },
        { text: '메뉴의 스크롤을 내려 홈 화면에 추가 버튼을 눌러주세요', img: '/images/IOS2.png' },
        { text: '추가버튼을 누르면 배경화면에 어플리케이션이 설치됩니다', img: '/images/IOS3.png' },
    ];

    const currentSteps = osTab === 'AOS' ? androidSteps : iosSteps;

    return (
        <>
            {/* Banner */}
            <div
                onClick={() => setShowModal(true)}
                className="cursor-pointer mb-6 rounded-xl shadow-sm border p-4 flex justify-center items-center bg-gradient-to-r from-[#e0f7fc] to-[#fefce8] hover:shadow-md transition-all active:scale-[0.98]"
            >
                <span className="text-slate-500 font-extrabold text-[15px] md:text-base tracking-tight drop-shadow-sm">
                    더 편하게 접속하는 방법이 있어요!
                </span>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-black">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col relative animate-fade-in-up">
                        {/* Header */}
                        <div className="p-5 border-b relative shadow-sm">
                            <h3 className="font-extrabold text-slate-800 text-lg pr-6 leading-tight break-keep text-center">
                                잠깐! 웹페이지를 앱으로 저장할 수 있다는 사실!
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 absolute top-4 right-4 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Toggle */}
                        <div className="px-6 pt-5 pb-2 flex justify-center gap-3">
                            <button
                                onClick={() => setOsTab('AOS')}
                                className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex-1 shadow-sm ${osTab === 'AOS' ? 'bg-[#00a8ff] text-white' : 'bg-[#7a7a7a] text-white hover:bg-slate-600'}`}
                            >
                                안드로이드
                            </button>
                            <button
                                onClick={() => setOsTab('IOS')}
                                className={`px-5 py-2 rounded-lg font-bold text-sm transition-all flex-1 shadow-sm ${osTab === 'IOS' ? 'bg-[#00a8ff] text-white' : 'bg-[#7a7a7a] text-white hover:bg-slate-600'}`}
                            >
                                아이폰
                            </button>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-white">
                            {currentSteps.map((step, idx) => (
                                <div key={idx} className="flex gap-4 items-center">
                                    <div className="w-[100px] sm:w-[120px] flex-shrink-0 bg-slate-100 rounded-md border-2 border-slate-700 shadow-sm aspect-square flex items-center justify-center overflow-hidden">
                                        <img src={step.img} alt={`step ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 pb-2 border-b border-gray-100">
                                        <p className="text-[15px] font-semibold text-slate-700 leading-relaxed break-keep">
                                            {step.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
