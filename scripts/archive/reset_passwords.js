import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const staffNames = ['owner', 'aulia', 'anna', 'septi', 'nita', 'anggun', 'azizah', 'intan', 'magang'];

async function resetPasswords() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Failed to list users:", error);
    return;
  }

  for (const name of staffNames) {
    const email = `${name}@umaratax.com`;
    const user = data.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`User ${email} not found.`);
      continue;
    }
    
    console.log(`Resetting password for ${name}...`);
    
    const passwordToSet = name === 'magang' ? 'UmarataxMagang!' : '123456';
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: passwordToSet }
    );
    
    if (updateError) {
      console.error(`Failed to reset password for ${name}:`, updateError.message);
    } else {
      console.log(`Successfully reset password for ${name} to ${passwordToSet}!`);
      const { error: dbError } = await supabase.from('users').update({ is_first_login: true }).eq('id', user.id);
      if (dbError) {
        console.error(`Failed to reset is_first_login for ${name}:`, dbError.message);
      } else {
        console.log(`Successfully reset is_first_login to true for ${name}!`);
      }
    }
  }
}

resetPasswords();
