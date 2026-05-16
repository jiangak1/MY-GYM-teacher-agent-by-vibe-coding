@echo off
chcp 65001 >nul
title AI 私人健康助手
cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║       AI 私人健康助手 v1.0           ║
echo   ╚══════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [错误] 未找到 Node.js，请先安装: https://nodejs.org
    pause
    exit /b 1
)

:: Check if first run
if not exist "node_modules" (
    echo   [1/3] 首次运行，安装依赖...
    call npm install
    echo.
)

if not exist "backend\node_modules" (
    echo   [1/3] 安装后端依赖...
    cd backend
    call npm install
    cd ..
    echo.
)

if not exist "frontend\node_modules" (
    echo   [1/3] 安装前端依赖...
    cd frontend
    call npm install
    cd ..
    echo.
)

:: Build frontend if needed
if not exist "frontend\dist" (
    echo   [2/3] 构建前端界面...
    cd frontend
    call npm run build
    cd ..
    echo.
)

:: Start server
echo   [3/3] 启动服务...
echo.
echo   ┌──────────────────────────────────────┐
echo   │  浏览器打开: http://localhost:3001    │
echo   │  关闭此窗口即可停止服务               │
echo   └──────────────────────────────────────┘
echo.

start http://localhost:3001
cd backend
npx tsx src/index.ts

pause
