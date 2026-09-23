Add-Type -AssemblyName System.Drawing

$bgPath = "C:\Users\dubey\.gemini\antigravity-ide\brain\fe9e30c4-43d1-4615-b6c9-0410d20ce8f3\hand_holding_phone_1790191516924.jpg"
$fgPath = "c:\Projects\Tap-Pay\web\public\screenshots\home.png"
$outputPath = "c:\Projects\Tap-Pay\web\public\hand-holding-tap-pay.png"

$bg = [System.Drawing.Image]::FromFile($bgPath)
$fg = [System.Drawing.Image]::FromFile($fgPath)

Write-Host "BG: $($bg.Width) x $($bg.Height)"
Write-Host "FG: $($fg.Width) x $($fg.Height)"

$bg.Dispose()
$fg.Dispose()
