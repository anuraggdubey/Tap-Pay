Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('c:\Projects\Tap-Pay\web\public\hand-holding-tap-pay.png')
$c = $b.GetPixel(20, 20)
Write-Host "Pixel 20,20: R=$($c.R) G=$($c.G) B=$($c.B)"
$b.Dispose()
