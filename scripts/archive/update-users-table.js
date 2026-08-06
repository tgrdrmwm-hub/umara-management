import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateUsers() {
  console.log('Logging in to update public.users...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'tegar@umaratax.com',
    password: '12345678'
  });
  
  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  console.log('Logged in successfully. Updating public.users...');
  
  // Update all users to set is_first_login = true
  const { data, error } = await supabase
    .from('users')
    .update({ is_first_login: true, password_changed_at: null, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all rows
    
  if (error) {
    console.error('Error updating public.users:', error);
  } else {
    console.log('Successfully updated public.users table for all users.');
  }
}

updateUsers();
