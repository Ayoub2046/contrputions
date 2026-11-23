@echo off
echo ==========================================================
echo Fixing Vercel Connection Timeout (Routing to 76.76.21.21)...
echo ==========================================================
echo.
echo Checking for Administrator privileges...
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

findstr /C:"contrputions.vercel.app" "C:\Windows\System32\drivers\etc\hosts" >nul 2>&1
if %errorLevel% EQU 0 (
    echo Entry already exists in hosts file!
) else (
    echo Adding '76.76.21.21 contrputions.vercel.app' to hosts file...
    echo. >> "C:\Windows\System32\drivers\etc\hosts"
    echo 76.76.21.21 contrputions.vercel.app >> "C:\Windows\System32\drivers\etc\hosts"
    echo Successfully added entry!
)

echo Flushing DNS cache...
ipconfig /flushdns
echo.
echo ==========================================================
echo [SUCCESS] Done! Refresh your browser at https://contrputions.vercel.app
echo ==========================================================
echo.
pause
