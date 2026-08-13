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

async function checkAndCreateUsers() {
  const targetEmails = ['naylarizki16@gmail.com', 'ayu808485@gmail.com'];
  
  for (const email of targetEmails) {
    console.log(`Checking user: ${email}...`);
    // Note: We'll just try to create the user directly. If they exist, it'll return an error we can catch.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'password123', // temporary, we'll reset it to 12345678 below just to be sure
      email_confirm: true
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`User ${email} already exists. Attempting to reset password to 12345678...`);
        // Find user by email
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error('Error fetching users:', listError);
          continue;
        }
        const user = usersData.users.find(u => u.email === email);
        if (user) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: '12345678' }
          );
          if (updateError) {
             console.error(`Error resetting password for ${email}:`, updateError);
          } else {
             console.log(`Successfully reset password to 12345678 for ${email}`);
             // Also reset is_first_login in public.users
             await supabaseAdmin.from('users').update({ is_first_login: true }).eq('id', user.id);
          }
        } else {
          console.error(`User ${email} exists but couldn't be found in listUsers.`);
        }
      } else {
        console.error(`Error creating user ${email}:`, error);
      }
    } else {
      console.log(`Created user ${email} with ID ${data.user.id}.`);
      console.log(`Resetting password to 12345678...`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { password: '12345678' }
      );
      if (!updateError) {
          console.log(`Successfully set password to 12345678 for new user ${email}`);
          // Also set in public.users just in case
          const { error: dbError } = await supabaseAdmin.from('users').insert({
              id: data.user.id,
              email: email,
              name: email.split('@')[0],
              role: 'staff',
              status: 'active',
              is_first_login: true,
              points: 0,
              attendance_rate: 0
          });
          if (dbError) {
              console.error(`Failed to insert into public.users for ${email}:`, dbError);
          } else {
              console.log(`Inserted ${email} into public.users`);
          }
      } else {
          console.error(`Failed to reset password for new user ${email}`, updateError);
      }
    }
  }
}

checkAndCreateUsers();
