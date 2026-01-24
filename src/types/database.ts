
export interface Class {
    id: string;
    grade: 'Middle' | 'High';
    name: string;
    teacher_id?: string;
    teacher_name?: string;
    teachers?: { name: string };
}

export interface Student {
    id: string;
    name: string;
    class_id: string | null; // Null if unassigned
    is_active: boolean;
}

export interface Teacher {
    id: string;
    name: string;
    role: 'Teacher' | 'Staff';
    is_active: boolean;
}

export interface WorshipLog {
    id: string;
    date: string;
    prayer: string;
    prayer_role: string;
    sermon_title: string;
    sermon_text: string;
    preacher: string;
    coupon_recipient_count: number;
    coupons_per_person: number;
}

export interface Attendance {
    id: string;
    log_id: string;
    student_id: string;
    status: 'present' | 'online';
}

export interface Offering {
    id: string;
    log_id: string;
    type: string;
    amount: number;
    memo: string;
}
