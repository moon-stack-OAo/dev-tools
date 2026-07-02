# scripts/download-pyodide.ps1
# 下载 Pyodide v0.26.4 完整发行版核心文件到 public/lib/pyodide/
# 用途：Python 在线运行沙箱（pyrun）工具的运行时
# 说明：Pyodide 文件未通过 npm 安装，由 CDN 下载本地化，避免每次冷启动都走远端拉取 ~12MB WASM。
# 幂等：已存在的同名文件会被覆盖；目录不存在则自动创建。

$ErrorActionPreference = "Continue"

$base = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full"
$files = @(
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip"
)

$destDir = Join-Path $PSScriptRoot "..\public\lib\pyodide"
$destDir = (Resolve-Path -LiteralPath (Split-Path -Parent $destDir) -ErrorAction SilentlyContinue).Path
if (-not $destDir) {
    $destDir = Join-Path (Get-Location).Path "public\lib\pyodide"
} else {
    $destDir = Join-Path $destDir "lib\pyodide"
}

if (-not (Test-Path -LiteralPath $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Write-Host "已创建目录: $destDir"
}

foreach ($f in $files) {
    $url = "$base/$f"
    $out = Join-Path $destDir $f
    try {
        Write-Host "下载 $f ..."
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        $size = (Get-Item -LiteralPath $out).Length
        Write-Host ("  OK {0} ({1:N0} bytes)" -f $f, $size)
    } catch {
        Write-Host ("  FAIL {0}: {1}" -f $f, $_.Exception.Message)
    }
}

Write-Host ""
Write-Host "验证总大小："
Get-ChildItem -LiteralPath $destDir | Measure-Object -Property Length -Sum | Select-Object @{N="TotalMB"; E={ [math]::Round($_.Sum/1MB, 2) }}, Count | Format-Table -AutoSize