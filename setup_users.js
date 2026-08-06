import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kjccciaomgdmrohsfqek.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY2NjaWFvbWdkbXJvaHNmcWVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMzNTgyNSwiZXhwIjoyMTAwOTExODI1fQ.CcfxwCk8XKsr-RLBpK70kLO91xLR_DGHyCWM_XYqEGw'
);

async function setup() {
  console.log('Creating magang@umaratax.com...');
  const { data: magang, error: magangErr } = await supabase.auth.admin.createUser({
    email: 'magang@umaratax.com',
    password: 'magang123',
    email_confirm: true,
    user_metadata: { name: 'Staff Magang' }
  });
  
  if (magangErr) {
    console.error('Magang Err:', magangErr.message);
  } else {
    console.log('Created magang:', magang.user.id);
    await supabase.from('users').upsert({
      id: magang.user.id,
      name: 'Staff Magang',
      email: 'magang@umaratax.com',
      role: 'staff_magang',
      status: 'active',
      is_first_login: true,
      points: 0
    });
  }

  console.log('Creating owner@umaratax.com...');
  const { data: owner, error: ownerErr } = await supabase.auth.admin.createUser({
    email: 'owner@umaratax.com',
    password: 'owner123',
    email_confirm: true,
    user_metadata: { name: 'Owner' }
  });
  
  if (ownerErr) {
    console.error('Owner Err:', ownerErr.message);
  } else {
    console.log('Created owner:', owner.user.id);
    await supabase.from('users').upsert({
      id: owner.user.id,
      name: 'Owner',
      email: 'owner@umaratax.com',
      role: 'owner',
      status: 'active',
      is_first_login: true,
      points: 0
    });
  }
}

setup();
