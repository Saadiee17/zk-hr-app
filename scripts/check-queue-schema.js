const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env.local';
const envs = fs.readFileSync(envPath, 'utf8').split('\n');
const supabaseUrl = envs.find(l => l.startsWith('SUPABASE_URL=')).substring('SUPABASE_URL='.length).trim();
const supabaseKey = envs.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('attendance_recalc_queue')
        .select('*')
        .limit(1);

    if (error) {
        console.error("DB Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("DB Columns:", Object.keys(data[0] || {}).join(', '));
    }
}
run();
