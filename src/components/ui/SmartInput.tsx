
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface SmartInputProps {
    value: string;
    onChange: (val: string) => void;
    options: string[]; // List of suggestions
    placeholder?: string;
    className?: string;
}

export default function SmartInput({ value, onChange, options, placeholder, className }: SmartInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Filter options based on input
        // "가" matches "가나다", "나" matches "가나다", "나다" matches "가나다"
        if (!value) {
            setFilteredOptions(options);
        } else {
            const lowerVal = value.toLowerCase();
            setFilteredOptions(options.filter(opt => opt.toLowerCase().includes(lowerVal)));
        }
    }, [value, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-md p-2 text-black pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 p-1 hover:bg-gray-100 rounded"
                    onClick={() => setIsOpen(!isOpen)}
                    tabIndex={-1}
                >
                    <ChevronDown size={16} />
                </button>
            </div>

            {isOpen && filteredOptions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.map((opt, idx) => (
                        <li
                            key={`${opt}-${idx}`}
                            className="p-2 hover:bg-indigo-50 cursor-pointer text-black text-sm"
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
