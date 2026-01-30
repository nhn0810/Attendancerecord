import React from 'react';
import { Student } from '@/types/database';

interface StudentNameDisplayProps {
    student: {
        name: string;
        tags?: string[] | null;
    };
    className?: string; // Additional classes
}

export default function StudentNameDisplay({ student, className = '' }: StudentNameDisplayProps) {
    const tags = student.tags || [];
    const isNewFriend = tags.includes('새친구');
    const isHanGwaYoung = tags.includes('한과영');

    if (isNewFriend) {
        return (
            <span className={`font-bold text-green-500 ${className}`}>
                {student.name}
            </span>
        );
    }

    if (isHanGwaYoung) {
        return (
            <span className={`italic text-amber-700 ${className}`}>
                {student.name}
            </span>
        );
    }

    return <span className={className}>{student.name}</span>;
}
