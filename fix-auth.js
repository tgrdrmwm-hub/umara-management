import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  const { data: publicUsers, error: publicError } = await supabase.from('users').select('*');
  if (publicError) {
    console.error("Error fetching public users:", publicError);
    return;
  }

  const { data: authData } = await supabase.auth.admin.listUsers();
  const validAuthIds = new Set(authData?.users.map(u => u.id) || []);

  for (const user of publicUsers) {
    if (validAuthIds.has(user.id)) {
      console.log(`User ${user.email} is already valid in auth. Skipping deletion.`);
      // Just try to update password
      await supabase.auth.admin.updateUserById(user.id, { password: '12345678' });
      continue;
    }

    console.log(`Recreating user: ${user.email}`);
    
    // Delete from public.users first to satisfy foreign key constraints if we try to delete from auth (if we could)
    await supabase.from('users').delete().eq('id', user.id);
    
    // We can't delete from auth if it's not a valid GoTrue user, but maybe deleteUser works?
    await supabase.auth.admin.deleteUser(user.id).catch(() => {});

    // Create via GoTrue
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: '12345678',
      email_confirm: true
    });

    if (createError) {
      console.error(`Failed to create ${user.email}:`, createError.message);
      // Try to re-insert the old record just in case, but with old ID it might fail if FK is checked.
      continue;
    }

    const newId = created.user.id;
    console.log(`Created auth user ${user.email} with new ID ${newId}`);

    // Re-insert to public.users
    const { error: insertError } = await supabase.from('users').insert({
      id: newId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      is_first_login: user.is_first_login,
      password_changed_at: user.password_changed_at,
      points: user.points,
      attendance_rate: user.attendance_rate,
      created_at: user.created_at,
      updated_at: user.updated_at
    });

    if (insertError) {
      console.error(`Failed to insert public user ${user.email}:`, insertError.message);
    } else {
      console.log(`Successfully recreated ${user.email}`);
    }
  }
}

fix();
