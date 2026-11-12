# SPDX-License-Identifier: MIT
[CmdletBinding()]
param([string]$CursorPath,[string]$LanguagePack,[string]$BackupDir,[switch]$PrepareOnly,[switch]$Restore)
$ErrorActionPreference='Stop'
function Read-Json([string]$File) { Get-Content -LiteralPath $File -Raw -Encoding UTF8 | ConvertFrom-Json }
function Hash([string]$File) { (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash }
function Is-Administrator { ([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }
if (-not $CursorPath) {
    $command=Get-Command cursor -ErrorAction SilentlyContinue
    if ($command -and $command.Source -match '[\\/]resources[\\/]app[\\/]bin[\\/]cursor\.cmd$') { $CursorPath=Join-Path (Split-Path -Parent $command.Source) '..' }
    else {
        foreach ($candidate in @("$env:LOCALAPPDATA\Programs\cursor","$env:ProgramFiles\cursor")) {
            if (Test-Path -LiteralPath (Join-Path $candidate 'resources\app\package.json')) { $CursorPath=$candidate; break }
        }
    }
}
if (-not $CursorPath) { throw 'Cursor not found. Supply -CursorPath with your existing installation directory or Cursor.exe.' }
if (Test-Path -LiteralPath $CursorPath -PathType Leaf) { $CursorPath=Split-Path -Parent $CursorPath }
if (Test-Path -LiteralPath (Join-Path $CursorPath 'package.json')) { $appRoot=(Resolve-Path -LiteralPath $CursorPath).Path }
else { $appRoot=(Resolve-Path -LiteralPath (Join-Path $CursorPath 'resources\app')).Path }
$supported=Read-Json (Join-Path $PSScriptRoot 'supported-build.json')
if ((Read-Json (Join-Path $appRoot 'package.json')).version -ne $supported.version) { throw 'Unsupported Cursor version. This release supports only the documented 3.29.15 build.' }
if (-not $BackupDir) {
    $hasher=[Security.Cryptography.SHA256]::Create()
    try { $rootId=([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($appRoot.ToLowerInvariant())))).Replace('-','').Substring(0,12) } finally { $hasher.Dispose() }
    $BackupDir=Join-Path $env:LOCALAPPDATA "CursorZhCn\3.29.15-$rootId"
}
$backupFull=[IO.Path]::GetFullPath($BackupDir).TrimEnd('\')
if ($backupFull.StartsWith($appRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase) -or $backupFull -eq $appRoot) { throw 'Backup directory must be outside the Cursor application directory.' }
$stateFile=Join-Path $backupFull 'deployment-state.json'
if ($Restore) {
    if (-not (Is-Administrator)) { throw 'Run as administrator to restore application resources.' }
    if (Get-Process Cursor -ErrorAction SilentlyContinue) { throw 'Close all Cursor windows first. Unsaved work will not be forcibly terminated.' }
    $state=Read-Json $stateFile
    if ($state.appRoot -ne $appRoot) { throw 'Backup belongs to another installation.' }
    foreach ($entry in $state.files) {
        $target=Join-Path $appRoot $entry.relative
        if ((Hash $target) -ne $entry.installedHash) { throw "File changed since installation; restore cancelled: $($entry.relative)" }
        if ((Hash $entry.backup) -ne $entry.backupHash) { throw 'Backup verification failed.' }
    }
    foreach ($entry in $state.files) { Copy-Item -LiteralPath $entry.backup -Destination (Join-Path $appRoot $entry.relative) -Force }
    if ((Test-Path -LiteralPath $state.argvPath) -and (Hash $state.argvPath) -eq $state.argvInstalledHash) {
        if ($state.argvExisted) { Copy-Item -LiteralPath (Join-Path $backupFull 'argv.original.json') -Destination $state.argvPath -Force }
        else { Remove-Item -LiteralPath $state.argvPath }
    }
    else { Write-Warning 'Display-language configuration changed after installation; preserving it.' }
    Write-Host 'Original application resources restored. The separately installed language pack is retained.'
    return
}
if (-not $PrepareOnly -and -not (Is-Administrator)) { throw 'Run as administrator to apply the patch, or use -PrepareOnly for a read-only preview.' }
if (-not $PrepareOnly -and (Get-Process Cursor -ErrorAction SilentlyContinue)) { throw 'Close all Cursor windows first. Unsaved work will not be forcibly terminated.' }
if (Test-Path -LiteralPath $stateFile) {
    $old=Read-Json $stateFile
    if ($old.appRoot -eq $appRoot -and @($old.files | Where-Object { (Hash (Join-Path $appRoot $_.relative)) -ne $_.installedHash }).Count -eq 0) { Write-Host 'This installation is already patched. Use -Restore to revert.'; return }
    throw 'An existing deployment has changed. Restore or inspect that backup before continuing.'
}
if (-not $LanguagePack) {
    $LanguagePack=Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.cursor\extensions') -Directory -Filter 'polang233.cursor-language-pack-*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'translations\zh-cn\main.i18n.json' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $LanguagePack) { throw 'Install polang233.cursor-language-pack first, or pass -LanguagePack with its zh-cn/main.i18n.json path.' }
$node=(Get-Command node -ErrorAction Stop).Source
& $node '--max-old-space-size=6144' '--expose-gc' (Join-Path $PSScriptRoot 'build.cjs') '--app-root' $appRoot '--output' $backupFull '--language-pack' $LanguagePack
if ($LASTEXITCODE -ne 0) { throw 'Patch preparation failed. Application resources were not modified.' }
if ($PrepareOnly) { Write-Host "Prepared and syntax-checked patch at $backupFull. No application/profile files changed."; return }
$manifest=Read-Json (Join-Path $backupFull 'apply-manifest.json')
$operations=@()
foreach ($entry in $manifest) {
    $target=Join-Path $appRoot $entry.file
    $name=Split-Path -Leaf $entry.file
    $source=Join-Path $backupFull ($name+'.localized')
    if ((Hash $target) -ne $entry.originalSHA256 -or (Hash $source) -ne $entry.patchedSHA256) { throw 'Files changed after preparation. Application resources were not modified.' }
    $operations += [pscustomobject]@{relative=$entry.file;source=$source;backup=(Join-Path $backupFull ($name+'.original'))}
}
$operations += [pscustomobject]@{relative='product.json';source=(Join-Path $backupFull 'product.localized.json');backup=(Join-Path $backupFull 'product.original.json')}
if ((Hash (Join-Path $appRoot 'product.json')) -ne (Hash (Join-Path $backupFull 'product.original.json'))) { throw 'Product configuration changed after preparation.' }
$argvPath=Join-Path $env:USERPROFILE '.cursor\argv.json'
$argvExisted=Test-Path -LiteralPath $argvPath
if ($argvExisted) { Copy-Item -LiteralPath $argvPath -Destination (Join-Path $backupFull 'argv.original.json') -Force }
$changed=@()
try {
    foreach ($operation in $operations) {
        $changed += $operation
        $target=Join-Path $appRoot $operation.relative
        Copy-Item -LiteralPath $operation.source -Destination $target -Force
        if ((Hash $target) -ne (Hash $operation.source)) { throw "Written-file verification failed: $($operation.relative)" }
    }
    & $node (Join-Path $PSScriptRoot 'locale.cjs') $appRoot $argvPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not update display language.' }
    $state=[pscustomobject]@{appRoot=$appRoot;argvPath=$argvPath;argvExisted=$argvExisted;argvInstalledHash=(Hash $argvPath);files=@($operations|ForEach-Object{[pscustomobject]@{relative=$_.relative;backup=$_.backup;backupHash=(Hash $_.backup);installedHash=(Hash (Join-Path $appRoot $_.relative))}})}
    $state|ConvertTo-Json -Depth 6|Set-Content -LiteralPath $stateFile -Encoding UTF8
} catch {
    foreach ($operation in $changed) { Copy-Item -LiteralPath $operation.backup -Destination (Join-Path $appRoot $operation.relative) -Force }
    if ($argvExisted) { Copy-Item -LiteralPath (Join-Path $backupFull 'argv.original.json') -Destination $argvPath -Force }
    elseif (Test-Path -LiteralPath $argvPath) { Remove-Item -LiteralPath $argvPath }
    throw
}
Write-Host "Installed Cursor Chinese UI patch. Backup: $backupFull"
Write-Host 'Start your existing Cursor normally. Application updates may overwrite this version-specific patch.'
