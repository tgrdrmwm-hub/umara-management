import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTasks() {
  console.log('Fetching tasks as Admin (bypass RLS)...');
  const { data: adminTasks, error: adminErr } = await supabaseAdmin.from('tasks').select('*');
  if (adminErr) console.error('Admin err:', adminErr);
  else console.log(`Admin found ${adminTasks.length} tasks.`);

  // Now as Intan
  const supabaseIntan = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  const { data: signIn, error: signErr } = await supabaseIntan.auth.signInWithPassword({
    email: 'intan@umaratax.com',
    password: '123456' // Just reset to this
  });
  
  if (signErr) {
    console.error('Failed to login as Intan:', signErr);
    return;
  }
  
  console.log('Fetching tasks as Intan...');
  const { data: intanTasks, error: intanErr } = await supabaseIntan.from('tasks').select('*');
  if (intanErr) console.error('Intan err:', intanErr);
  else console.log(`Intan found ${intanTasks?.length} tasks.`);
}

checkTasks();
