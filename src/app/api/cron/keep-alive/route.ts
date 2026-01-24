
import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

export async function GET() {
    try {
        // Perform a lightweight query to wake up the database
        const { count, error } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return NextResponse.json({ message: 'Keep-alive success', count });
    } catch (error) {
        return NextResponse.json({ error: 'Keep-alive failed' }, { status: 500 });
    }
}
