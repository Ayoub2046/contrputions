@echo off
echo ====================================================
echo Pushing ClassBank commits to GitHub main branch...
echo ====================================================
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Commits pushed to GitHub successfully!
    echo Vercel will now automatically trigger a new deployment.
) else (
    echo [ERROR] Git push failed. Please verify your GitHub credentials.
)
echo.
pause
