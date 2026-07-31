import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  const { data: publicUsers, error: publicError } = await supabase.from('users').select('*');
  if (publicError) {
    console.error("Error fetching public users:", publicError);
    return;
  }

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Error fetching auth users:", authError);
    return;
  }
  
  const authEmails = new Set(authUsers.users.map(u => u.email));

  for (const pUser of publicUsers) {
    if (!authEmails.has(pUser.email)) {
      console.log(`Creating auth user for ${pUser.email}...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: pUser.email,
        password: 'password', // Default password 8 chars
        email_confirm: true
      });
      if (error) {
        console.error(`Error creating user ${pUser.email}:`, error);
      } else {
        console.log(`User created successfully: ${pUser.email}`);
        // We might want to link the id, but public.users id is probably already a uuid generated, wait, let's see.
        // If public.users already has a UUID, but we just created a new Auth user, the Auth user will have a NEW UUID!
        // This might cause an issue where auth.uid() doesn't match the one in public.users.
        // Let's check public.users id first!
      }
    }
  }
}

seed();
