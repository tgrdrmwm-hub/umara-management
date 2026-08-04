import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAllPasswords() {
  console.log('Fetching all users...');
  
  let allUsers = [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: page,
      perPage: perPage
    });
    
    if (listError) {
      console.error('Error fetching users:', listError);
      return;
    }
    
    if (users.length === 0) {
      break;
    }
    
    allUsers = [...allUsers, ...users];
    page++;
  }
  
  console.log(`Found ${allUsers.length} users. Resetting passwords to 12345678...`);
  
  for (const user of allUsers) {
    console.log(`Resetting password for ${user.email} (${user.id})...`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: '12345678' }
    );
    
    if (updateError) {
      console.error(`Error resetting password for ${user.email}:`, updateError);
    } else {
      // Also update the public.users table as seen in the sql script
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .update({ is_first_login: true, password_changed_at: null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
        
      if (dbError) {
        console.error(`Error updating public.users for ${user.email}:`, dbError);
      } else {
        console.log(`Successfully reset password and updated profile for ${user.email}`);
      }
    }
  }
  
  console.log('Password reset process complete.');
}

resetAllPasswords();