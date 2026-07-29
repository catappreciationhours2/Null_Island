@echo off
powershell -Command "$cur = [Environment]::GetEnvironmentVariable('PATH','User'); [Environment]::SetEnvironmentVariable('PATH', $cur + ';C:\Program Files\nodejs\', 'User')"
echo.
echo Done! Open a NEW terminal window and run:
echo   cd Desktop\Null_Island
echo   npm install
echo   npm run dev
echo.
pause
