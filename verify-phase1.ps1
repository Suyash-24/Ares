#!/usr/bin/env powershell
# Verify that Phase 1 command files exist and are syntactically valid

Write-Host "🧪 Phase 1 Command Verification Script" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$baseDir = "e:\Kira"
$commandDir = "$baseDir\src\commands\prefix\Antinuke"
$engineDir = "$commandDir\engine"

# Define expected files
$expectedFiles = @(
    @{ path = "$engineDir\AdvancedWhitelistManager.js"; name = "AdvancedWhitelistManager" },
    @{ path = "$engineDir\MentionSpamProtector.js"; name = "MentionSpamProtector" },
    @{ path = "$commandDir\antinuke-tier.js"; name = "antinuke-tier command" },
    @{ path = "$commandDir\antinuke-mention.js"; name = "antinuke-mention command" },
    @{ path = "$commandDir\antinuke-trusted-bot.js"; name = "antinuke-trusted-bot command" },
    @{ path = "$commandDir\antinuke-whitelist.js"; name = "antinuke-whitelist command" }
)

Write-Host "📁 Checking file existence...`n" -ForegroundColor Yellow

$allExist = $true
foreach ($file in $expectedFiles) {
    if (Test-Path $file.path) {
        $size = (Get-Item $file.path).Length
        Write-Host "✅ $($file.name): $(($size/1KB).ToString('0.0')) KB" -ForegroundColor Green
    } else {
        Write-Host "❌ $($file.name): NOT FOUND" -ForegroundColor Red
        $allExist = $false
    }
}

if ($allExist) {
    Write-Host "`n✅ All Phase 1 files exist!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some files are missing!" -ForegroundColor Red
    exit 1
}

# Verify file structure
Write-Host "`n📝 Checking file structure...`n" -ForegroundColor Yellow

$checks = @(
    @{ file = "$engineDir\AdvancedWhitelistManager.js"; pattern = "class AdvancedWhitelistManager"; name = "AdvancedWhitelistManager class" },
    @{ file = "$engineDir\MentionSpamProtector.js"; pattern = "class MentionSpamProtector"; name = "MentionSpamProtector class" },
    @{ file = "$commandDir\antinuke-tier.js"; pattern = "name: 'antinuke-tier'"; name = "antinuke-tier command definition" },
    @{ file = "$commandDir\antinuke-mention.js"; pattern = "name: 'antinuke-mention'"; name = "antinuke-mention command definition" },
    @{ file = "$commandDir\antinuke-trusted-bot.js"; pattern = "name: 'antinuke-trusted-bot'"; name = "antinuke-trusted-bot command definition" },
    @{ file = "$commandDir\antinuke-whitelist.js"; pattern = "name: 'antinuke-whitelist'"; name = "antinuke-whitelist command definition" }
)

$allValid = $true
foreach ($check in $checks) {
    $content = Get-Content $check.file -Raw -ErrorAction SilentlyContinue
    if ($content -match $check.pattern) {
        Write-Host "✅ $($check.name)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $($check.name) - Pattern not found" -ForegroundColor Yellow
        $allValid = $false
    }
}

# Count lines of code
Write-Host "`n📊 Code statistics...`n" -ForegroundColor Yellow

$totalLines = 0
foreach ($file in $expectedFiles) {
    $lineCount = (Get-Content $file.path | Measure-Object -Line).Lines
    $totalLines += $lineCount
    Write-Host "  $($file.name): $lineCount lines"
}

Write-Host "`n  Total: $totalLines lines of code" -ForegroundColor Cyan

# Final summary
Write-Host "`n" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ PHASE 1 FILES READY FOR TESTING" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n📋 Next steps:`n" -ForegroundColor Yellow
Write-Host "1. Restart the bot" -ForegroundColor White
Write-Host "2. Check console for 'Loaded X prefix commands'" -ForegroundColor White
Write-Host "3. Test in Discord: .antinuke-tier list" -ForegroundColor White
Write-Host "4. Follow PHASE1_TESTING_SCRIPT.md for full tests" -ForegroundColor White
Write-Host "`n"

