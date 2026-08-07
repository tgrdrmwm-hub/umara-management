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

const newStaff = ['anna', 'nita', 'azizah'];

async function fixStaff() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Failed to list users:", error);
    return;
  }

  for (const name of newStaff) {
    const email = `${name}@umaratax.com`;
    const user = data.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`Could not find auth user for ${email}`);
      continue;
    }
    
    console.log(`Found auth user for ${name} with ID ${user.id}`);
    
    // Check if in public.users
    const { data: publicUser } = await supabase.from('users').select('*').eq('id', user.id).single();
    
    if (!publicUser) {
      console.log(`Inserting ${name} into public.users...`);
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.id,
          name: name,
          email: email,
          role: 'staff',
          points: 0,
          is_first_login: true
        }
      ]);
      if (insertError) {
        console.error(`Failed to insert ${name}:`, insertError.message);
      } else {
        console.log(`Successfully added ${name}!`);
      }
    } else {
      console.log(`${name} is already in public.users!`);
    }
  }
}

fixStaff();
