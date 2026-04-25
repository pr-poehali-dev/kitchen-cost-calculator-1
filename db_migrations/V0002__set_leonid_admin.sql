UPDATE users SET role = 'admin' WHERE login = 'leonid';
UPDATE users SET status = 'banned' WHERE login != 'leonid';