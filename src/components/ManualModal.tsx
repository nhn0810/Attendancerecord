'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const pages = [
    { img: '/images/1.jpg', text: '사이트의 메인메뉴입니다. 예배 및 출석, 반 명단관리, 기록보기, 출석 통계 4가지 메뉴가 있습니다.\n가장먼저 예배 및 출석 메뉴부터 설명하겠습니다.' },
    { img: '/images/2.jpg', text: '첫번째로 입력할 내용은 예배정보 입니다. 예배 당일의 날짜 입력과 기도자, 설교자, 말씀제목, 본문을 해당 일자에 맞게 기록하여 주세요. 기도자의 경우 호칭을 적을 수 있습니다. 형제 자매 외 회장 부회장 서기 등등의 호칭을 설정할 수 있으니 활용하여 주세요\n기록을 완료하였다면 반드시! 저장을 하셔야 합니다. 예배정보가 저장이 되어야만 이후의 출석체크, 헌금기록이 가능합니다.' },
    { img: '/images/3.jpg', text: '다음으로 입력할 사항은 학생들의 출석정보 입니다. 해당일자 예배에 온/오프라인으로 참여한 학생들의 이름을 클릭하여 파란색 강조표시를 남겨주세요. 반명 옆의 톱니바퀴 버튼은 관리모드 버튼입니다. 다음 페이지에서 이어서 설명합니다.' },
    { img: '/images/4.jpg', text: '톱니버튼을 눌러 관리모드를 실행하면 학생들의 이름 위에 x가 생깁니다. x버튼을 눌러 학생의 반 배정을 해제할 수 있습니다.\n또는 ADD버튼을 통해 학생을 추가할 수 있습니다' },
    { img: '/images/5.jpg', text: 'ADD버튼을 눌러 학생을 추가합니다. 새로운 학생의 이름을 입력하여 생성 및 추가를 진행하면 자연스럽게 반에 배정됩니다.\n이 방식은 새로운 학생데이터를 생성하기 때문에 이미 존재하는 경우 절대 생성하지 마세요.' },
    { img: '/images/6.jpg', text: '이미 학생데이터가 존재하는 경우 미배정 선택을 통해 반배정을 시도하세요. 만약 다른 반에 속해있는 경우 반에서 학생을 내보내는 작업을 진행해주세요.' },
    { img: '/images/7.jpg', text: '새친구 등록이 있다면 ADD버튼을 눌러 등록해주세요.' },
    { img: '/images/8.jpg', text: '학생 추가와 마찬가지로 이름을 쓸 수도 있고 미배정 학생을 선택해서 새친구로 설정할 수 있습니다.\n*주의* 새친구로 설정하게 된다면 이전까지의 모든 출석기록이 초기화되므로 주의하세요.' },
    { img: '/images/9.jpg', text: '온라인 출석이 있는 경우 확인하여 인원수와 명단을 기록하여 저장해주세요.' },
    { img: '/images/10.jpg', text: '헌금을 기록할때는 ,를 따로 입력하지 않고 숫자만 입력해주세요. 주정헌금을 제외한 헌금들은 명단과 금액을 추가로 함께 입력해주세요.' },
    { img: '/images/11.jpg', text: '교사/간사 출석란입니다. 학생과 마찬가지로 출석관리해주세요' },
    { img: '/images/12.jpg', text: '명단관리 버튼을 누르면 입력/삭제 기능이 활성화됩니다.' },
    { img: '/images/13.jpg', text: '만나쿠폰을 수령한 인원을 입력후 저장해주세요' },
    { img: '/images/14.jpg', text: '가장 아래에 JPG다운로드 버튼을 눌러 제출용 양식으로 다운로드할 수 있습니다.' },
    { img: '/images/15.jpg', text: '다음 메뉴는 반/ 명단관리입니다. 메인 메뉴에서 버튼을 눌러 들어갈 수 있습니다.\n중등부 고등부로 나뉘어 있으며 각 부서를 선택해 학년-반 의 형식으로 반이름을 입력하고 교사를 선택합니다. 추가버튼을 누르면 반 생성이 완료됩니다.\n삭제는 반 박스 옆의 휴지통 버튼을 눌러 삭제할 수 있습니다. 반이 삭제되면 소속된 학생들은 모두 미배정 학생이 됩니다.' },
    { img: '/images/16.jpg', text: '다음은 미배정 학생 명단입니다. 반에 소속되지 않은 학생들이 나열되어있습니다.\n하단에 입력란에 학생의 이름만 작성하여 +버튼을 눌러 학생을 생성해주세요.\n반배정 드롭다운을 통해 빠르게 반 배정이 가능합니다\n휴지통 버튼을 눌러 완전히 삭제할 수 있습니다. 삭제된다면 출석기록이 삭제되므로 주의하세요.' },
    { img: '/images/17.jpg', text: '반별 선택 리스트입니다. 학생 명단을 확인하고 싶은 반의 이름을 클릭해주세요' },
    { img: '/images/18.jpg', text: '각 학생에게는 내보내기 버튼과 톱니 버튼이 존재합니다. 내보내기가 이뤄진 후에 다른 반으로 배정이 가능해지므로 잊지 말아주세요.' },
    { img: '/images/19.jpg', text: '학생의 톱니버튼은 학생의 이름과 새친구, 한과영 정보를 입력할 수 있게 합니다. 새친구 태그를 추가하게 된다면 출석정보가 초기화 되므로 주의해주세요' },
    { img: '/images/20.jpg', text: '다음으로 3번째 예배일지 기록 메뉴입니다. 메인 메뉴에서 버튼을 눌러 진입합니다. 예배마다의 날짜와 출석인원, 헌금액을 한눈에 확인 가능합니다.' },
    { img: '/images/21.jpg', text: '마지막 메뉴로 출석 통계입니다. 옵션을 설정하여 원하는 학생들의 전체 출석률을 확인할 수 있습니다.' },
];

export default function ManualModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    // Reset index when opened
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentIndex < pages.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.changedTouches[0].clientX;
        touchStartY.current = e.changedTouches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchStartX.current - touchEndX;
        const diffY = touchStartY.current - touchEndY;

        // If moved more horizontally than vertically and swipe distance is over 50px
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                handleNext();
            } else {
                handlePrev();
            }
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    const current = pages[currentIndex];

    return (
        <div className="fixed inset-0 z-[200] bg-[#111] text-white flex flex-col sm:p-4 md:p-8 animate-fade-in touch-none">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-[#111]/80 backdrop-blur-md relative z-10 shrink-0 border-b border-gray-800">
                <div className="font-extrabold tracking-wide text-gray-200 text-lg flex items-center gap-2">
                    <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">Guide</span>
                    사용 설명서 ({currentIndex + 1} / {pages.length})
                </div>
                <button onClick={onClose} className="p-2 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 hover:text-white transition">
                    <X size={20} />
                </button>
            </div>

            {/* Content Area - Split between Image and Text */}
            <div
                className="flex-1 flex flex-col overflow-hidden relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Image Section - Scrollable vertically if tall (like image 2, 15, 16, 21) */}
                <div className="flex-1 overflow-y-auto w-full relative bg-black flex justify-center items-start border-b border-gray-800 p-2">
                    <img
                        src={current.img}
                        alt={`설명서 페이지 ${currentIndex + 1}`}
                        className="w-full max-w-[1080px] object-contain object-top"
                    />
                </div>

                {/* Text Section */}
                <div className="h-44 sm:h-[200px] shrink-0 bg-[#161616] p-5 sm:p-7 flex flex-col justify-between z-10">
                    <div className="overflow-y-auto flex-1 mb-2 pr-2 custom-scrollbar">
                        <p className="text-[15px] sm:text-lg text-gray-100 leading-relaxed font-semibold whitespace-pre-wrap break-keep tracking-tight">
                            {current.text}
                        </p>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-800">
                        <button
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className={`flex items-center gap-1.5 p-2 rounded-xl transition-all ${currentIndex === 0 ? 'text-gray-700' : 'text-blue-400 hover:bg-white/10 active:scale-95'}`}
                        >
                            <ChevronLeft size={24} /> <span className="text-sm tracking-widest font-bold">이전</span>
                        </button>

                        {/* Progress Bar Alternative */}
                        <div className="flex-1 mx-6 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block relative">
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / pages.length) * 100}%` }}
                            />
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={currentIndex === pages.length - 1}
                            className={`flex items-center gap-1.5 p-2 rounded-xl transition-all ${currentIndex === pages.length - 1 ? 'text-gray-700' : 'text-blue-400 hover:bg-white/10 active:scale-95'}`}
                        >
                            <span className="text-sm tracking-widest font-bold">다음</span> <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
