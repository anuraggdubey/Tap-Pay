Add-Type -AssemblyName System.Drawing
$b = [System.Drawing.Bitmap]::FromFile('c:\Projects\Tap-Pay\web\public\hand-holding-tap-pay.png')
$points = @(
    @{X=20; Y=20},
    @{X=100; Y=100},
    @{X=800; Y=20},
    @{X=850; Y=500},
    @{X=50; Y=500}
)
foreach ($p in $points) {
    $c = $b.GetPixel($p.X, $p.Y)
    Write-Host "($($p.X), $($p.Y)): R=$($c.R) G=$($c.G) B=$($c.B)"
}
$b.Dispose()
