import { supabase } from './supabase/client';

export async function addStudentWithVerification(baseNameRaw: string, payloadBase: any, addSuccessCallback: (studentName: string) => void) {
    const baseName = baseNameRaw.trim();
    if (!baseName) return;

    // Search for existing students with the same base name
    const { data: existingSameNames } = await supabase
        .from('students')
        .select('id, name, class_id, classes(grade, name)')
        .like('name', baseName + '%');

    let newName = baseName;
    let renameOldStudent = null;

    if (existingSameNames && existingSameNames.length > 0) {
        // Filter strictly matching baseName or baseName + [A-Z]
        const matchingStudents = existingSameNames.filter(s => s.name === baseName || new RegExp(`^${baseName}[A-Z]$`).test(s.name));

        const exactMatch = matchingStudents.find(s => s.name === baseName);

        if (exactMatch) {
            const cls: any = Array.isArray(exactMatch.classes) ? exactMatch.classes[0] : exactMatch.classes;
            const gradeStr = cls ? (cls.grade === 'Middle' ? '중등' : '고등') : '미배정';
            const classStr = cls ? `-${cls.name}` : '';
            const classInfo = `${gradeStr}${classStr}`;

            if (!window.confirm(`"${classInfo} ${baseName}" 학생이 이미 존재합니다. 동명이인입니까?\n(취소를 누르면 추가되지 않습니다)`)) {
                return;
            }

            let highestCharCode = 64; // 'A' is 65
            matchingStudents.forEach(s => {
                if (s.name !== baseName) {
                    const suffix = s.name.slice(baseName.length);
                    const code = suffix.charCodeAt(0);
                    if (code > highestCharCode) highestCharCode = code;
                }
            });

            if (highestCharCode === 64) {
                newName = baseName + 'B';
                renameOldStudent = { id: exactMatch.id, newName: baseName + 'A', oldNameInfo: `${classInfo}-${baseName}` };
            } else {
                newName = baseName + String.fromCharCode(highestCharCode + 1);
                renameOldStudent = { id: exactMatch.id, newName: baseName + 'A', oldNameInfo: `${classInfo}-${baseName}` };
            }
        } else if (matchingStudents.length > 0) {
            // "홍길동A", "홍길동B" exists, but "홍길동" doesn't. 
            // The user typed "홍길동". We should probably just tell them it exists.
            let highestCharCode = 64;
            matchingStudents.forEach(s => {
                const suffix = s.name.slice(baseName.length);
                const code = suffix.charCodeAt(0);
                if (code > highestCharCode) highestCharCode = code;
            });
            newName = baseName + String.fromCharCode(highestCharCode + 1);
            window.alert(`"${baseName}"(이)라는 이름이 이미 동명이인으로 존재하여, 방금 입력하신 이름은 "${newName}"(으)로 저장됩니다.`);
        }
    }

    if (renameOldStudent) {
        window.alert(`기존 "${renameOldStudent.oldNameInfo}"은(는) "${renameOldStudent.newName}"(으)로, 방금 입력하신 이름은 "${newName}"(으)로 저장되었습니다.`);
        await supabase.from('students').update({ name: renameOldStudent.newName }).eq('id', renameOldStudent.id);
    }

    const payload = { ...payloadBase, name: newName };
    const { error } = await supabase.from('students').insert([payload]);

    if (error) {
        window.alert('학생 추가 실패: ' + error.message);
    } else {
        addSuccessCallback(newName);
    }
}
