import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsers() {
  const { data: publicUsers, error: publicError } = await supabase.from('users').select('*');
  if (publicError) {
    console.error("Error fetching public users:", publicError);
    return;
  }

  for (const user of publicUsers) {
    console.log(`Fixing user: ${user.email} (ID: ${user.id})`);
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: '12345678',
      email_confirm: true
    });
    if (error) {
      console.error(`Error updating user ${user.email}:`, error);
    } else {
      console.log(`Successfully updated password for ${user.email}`);
    }
  }
}

fixUsers();
