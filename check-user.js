import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching auth users:", error);
  } else {
    console.log("Auth users:", users.users.map(u => u.email));
  }

  const { data: publicUsers, error: publicError } = await supabase.from('users').select('*');
  if (publicError) {
    console.error("Error fetching public users:", publicError);
  } else {
    console.log("Public users:", publicUsers.map(u => u.email));
  }
}

checkUser();
