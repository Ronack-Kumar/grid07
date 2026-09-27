$ErrorActionPreference = "Stop"

function Write-Log {
    param ([string]$Message)
    Write-Host "[GRID07] $Message" -ForegroundColor Cyan
}

function Write-ErrorLog {
    param ([string]$Message)
    Write-Host "[GRID07 ERROR] $Message" -ForegroundColor Red
}

# Prerequisites check
try {
    $null = Get-Command python -ErrorAction Stop
} catch {
    Write-ErrorLog "Python is not installed or not in PATH."
    exit 1
}

try {
    $null = Get-Command npm -ErrorAction Stop
} catch {
    Write-ErrorLog "npm (Node.js) is not installed or not in PATH."
    exit 1
}

$RootDir = $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

if (-not (Test-Path $BackendDir)) {
    Write-ErrorLog "Backend directory not found at $BackendDir"
    exit 1
}

if (-not (Test-Path $FrontendDir)) {
    Write-ErrorLog "Frontend directory not found at $FrontendDir"
    exit 1
}

# Check for virtual environment
$VenvDir = ""
if (Test-Path (Join-Path $BackendDir "venv")) {
    $VenvDir = "venv"
} elseif (Test-Path (Join-Path $BackendDir ".venv")) {
    $VenvDir = ".venv"
} else {
    Write-ErrorLog "Python virtual environment not found in backend/venv or backend/.venv."
    Write-ErrorLog "Please create it and install requirements."
    exit 1
}

Write-Log "Starting backend..."
$BackendCommand = "[System.Console]::Title = 'GRID07 Backend'; cd '$BackendDir'; .\$VenvDir\Scripts\activate; if (`$?) { uvicorn app.main:app --reload --port 8000 } else { Write-Host 'Failed to activate venv' -ForegroundColor Red }"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "`"$BackendCommand`""

Write-Log "Starting frontend..."
$FrontendCommand = "[System.Console]::Title = 'GRID07 Frontend'; cd '$FrontendDir'; if (-not (Test-Path 'node_modules')) { Write-Host 'Installing frontend dependencies...'; npm install }; npm run dev"
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "`"$FrontendCommand`""

Write-Log "Backend: http://localhost:8000"
Write-Log "Frontend: http://localhost:3000"
Write-Log "Development environment is starting up in separate windows!"
