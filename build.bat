@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM  Shadow Swap - build script
REM
REM  Shadow Swap is a static client-side Phaser 3 game (plain HTML/JS/CSS, no
REM  bundler). "Building" just stages the runtime files into a clean output
REM  folder. Passing "run" additionally serves that folder over HTTP and opens
REM  the browser.
REM
REM  An HTTP server is REQUIRED to run the game: game/js/managers/ConfigManager.js
REM  loads its JSON configs via fetch(), which browsers block over file://.
REM
REM  Usage:
REM    build.bat        Build only (stage build-files\)
REM    build.bat run    Build, then serve build-files\ via "npx serve" + open browser
REM
REM  Note: "npx serve" downloads the "serve" package on first use; Node.js required.
REM ============================================================================

REM Resolve paths relative to this script, not the caller's CWD.
set "ROOT=%~dp0"
set "SRC=%ROOT%game"
set "OUT=%ROOT%build-files"
set "PORT=3000"

echo.
echo === Shadow Swap build ===
echo Source: %SRC%
echo Output: %OUT%
echo.

REM --- Sanity check: source exists ------------------------------------------
if not exist "%SRC%\index.html" (
    echo [ERROR] Could not find "%SRC%\index.html".
    echo         Run this script from the repository root.
    exit /b 1
)

REM --- Clean output ----------------------------------------------------------
if exist "%OUT%" (
    echo Cleaning previous output...
    rmdir /s /q "%OUT%"
    if exist "%OUT%" (
        echo [ERROR] Failed to remove existing "%OUT%".
        exit /b 1
    )
)
mkdir "%OUT%"
if errorlevel 1 (
    echo [ERROR] Failed to create "%OUT%".
    exit /b 1
)

REM --- Stage runtime files ---------------------------------------------------
echo Copying index.html...
copy /y "%SRC%\index.html" "%OUT%\index.html" >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy index.html.
    exit /b 1
)

for %%D in (styles js data) do (
    echo Copying %%D\ ...
    xcopy "%SRC%\%%D" "%OUT%\%%D" /e /i /y >nul
    if errorlevel 1 (
        echo [ERROR] Failed to copy %%D\.
        exit /b 1
    )
)

echo.
echo [OK] Build complete.
echo      Output: %OUT%
echo.

REM --- Optional run ----------------------------------------------------------
REM Treat the first argument equal to "run" (case-insensitive) as the run flag.
if /i not "%~1"=="run" goto :eof

echo === Run requested ===

REM Verify npx (Node.js) is available.
where npx >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npx ^(Node.js^) was not found on PATH.
    echo         Install Node.js from https://nodejs.org/ to run the game.
    exit /b 1
)

echo Starting local server on http://localhost:%PORT% ...
echo (First run downloads the "serve" package; press Ctrl+C to stop.)
echo.

REM Open the browser shortly after the server starts.
start "" http://localhost:%PORT%

REM Serve the built artifact (not the source) so "run" validates the real output.
call npx serve "%OUT%" -l %PORT%
exit /b %errorlevel%
