Add-Type -AssemblyName System.Drawing

$bgPath = "C:\Users\dubey\.gemini\antigravity-ide\brain\fe9e30c4-43d1-4615-b6c9-0410d20ce8f3\hand_holding_phone_1790191516924.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($bgPath)

# Sample along horizontal line Y = 500 (middle of phone)
$minX = 9999
$maxX = 0
for ($x = 200; $x -lt 700; $x++) {
    $c = $bmp.GetPixel($x, 500)
    # Check if pixel is dark (screen interior)
    if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 25) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
    }
}

# Sample along vertical line X = 450 (middle of phone)
$minY = 9999
$maxY = 0
for ($y = 200; $y -lt 1000; $y++) {
    $c = $bmp.GetPixel(450, $y)
    if ($c.R -lt 25 -and $c.G -lt 25 -and $c.B -lt 25) {
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
    }
}

Write-Host "Screen bounds approx: X=$minX to $maxX (width = $($maxX - $minX)), Y=$minY to $maxY (height = $($maxY - $minY))"
$bmp.Dispose()
