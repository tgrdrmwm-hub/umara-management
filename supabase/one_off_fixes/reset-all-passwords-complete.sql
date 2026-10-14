UPDATE public.users SET is_first_login = true, password_changed_at = NULL, updated_at = NOW();

SELECT auth.admin.update_user_by_id('4533a329-5502-4fb0-8382-434c8504a253', '12345678');
SELECT auth.admin.update_user_by_id('19bef684-2589-482c-ab87-71902cce008c', '12345678');
SELECT auth.admin.update_user_by_id('adb3e87e-f0dc-409f-a4dd-40f119c3b73a', '12345678');
SELECT auth.admin.update_user_by_id('b588ab7c-97b3-4b25-a4c6-0a9b60c34aa6', '12345678');
SELECT auth.admin.update_user_by_id('a8f670e4-6a36-4884-ab6c-d62cd16e5c95', '12345678');
SELECT auth.admin.update_user_by_id('c18e1dbc-4e4f-4af8-8d8e-656ee6a68b27', '12345678');
SELECT auth.admin.update_user_by_id('451149f5-153f-42f4-a906-da969cb253a4', '12345678');
SELECT auth.admin.update_user_by_id('86b5bc01-1031-4599-b2ba-8267012fcf7d', '12345678');