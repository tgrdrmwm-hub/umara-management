# User Credentials - Umaratax Management

## Default Login Information

**Password for all users:** `12345678`

**Note:** All users are configured with `is_first_login: true`, which means they will be automatically redirected to the change password page after their first successful login.

**Important:** After running the SQL script, you need to set the password for each user via Supabase Dashboard:
1. Go to Authentication -> Users
2. Click on each user
3. Click "Set password" and enter `12345678`

## User List

| No | Name    | Email                     | Role   | Status  | First Login |
|----|---------|---------------------------|--------|---------|-------------|
| 1  | Aulia   | aulia@umaratax.com        | staff  | active  | Yes         |
| 2  | Anna    | anna@umaratax.com         | staff  | active  | Yes         |
| 3  | Septi   | septi@umaratax.com        | staff  | active  | Yes         |
| 4  | Nita    | nita@umaratax.com         | staff  | active  | Yes         |
| 5  | Anggun  | anggun@umaratax.com       | staff  | active  | Yes         |
| 6  | Azizah  | azizah@umaratax.com       | staff  | active  | Yes         |
| 7  | Intan   | intan@umaratax.com        | staff  | active  | Yes         |

## How to Add Users to Database

### Method 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Authentication -> Users**
3. Click **"Add User"** button
4. Add each user with:
   - Email: [user]@umaratax.com (e.g., aulia@umaratax.com)
   - Password: `12345678`
   - Enable **"Confirm email"** option
5. Repeat for all 7 users
6. Run `supabase/seed_users.sql` in SQL Editor to add profiles to public.users table

### Method 2: Using SQL Editor Only
1. Run `supabase/seed_users.sql` in SQL Editor
2. This will create users in auth.users and public.users tables
3. Then set password for each user via Dashboard (Authentication -> Users -> Set Password to `12345678`)

### Method 3: Using Supabase API
You can also use the Supabase auth.admin API to create users programmatically.

## How to Use

1. Navigate to `/login` in your application
2. Enter one of the emails above
3. Use password: `12345678`
4. On first login, you will be redirected to change your password
5. After changing password, you will be redirected to the dashboard

## Security Notes

- All passwords are hashed using bcrypt before storage
- The default password should be changed immediately after first login
- Users have `staff` role by default
- All users are set to `active` status