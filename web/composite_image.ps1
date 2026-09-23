Add-Type -AssemblyName System.Drawing

$bgPath = "C:\Users\dubey\.gemini\antigravity-ide\brain\fe9e30c4-43d1-4615-b6c9-0410d20ce8f3\hand_holding_phone_1790191516924.jpg"
$fgPath = "c:\Projects\Tap-Pay\web\public\screenshots\home.png"
$outputPath = "c:\Projects\Tap-Pay\web\public\hand-holding-tap-pay.png"

$bg = [System.Drawing.Bitmap]::FromFile($bgPath)
$fg = [System.Drawing.Bitmap]::FromFile($fgPath)

# Create a graphic context on bg
$g = [System.Drawing.Graphics]::FromImage($bg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Screen target rect
$rect = New-Object System.Drawing.Rectangle(300, 270, 302, 660)

# Create rounded path for screen clipping
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 32
$d = $radius * 2
$path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
$path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
$path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
$path.CloseFigure()

$g.SetClip($path)
$g.DrawImage($fg, $rect)
$g.ResetClip()

# Draw notch / Dynamic Island
$notchBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$notchRect = New-Object System.Drawing.Rectangle(406, 278, 90, 26)
$notchPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$nr = 13
$nd = $nr * 2
$notchPath.AddArc($notchRect.X, $notchRect.Y, $nd, $nd, 180, 90)
$notchPath.AddArc($notchRect.Right - $nd, $notchRect.Y, $nd, $nd, 270, 90)
$notchPath.AddArc($notchRect.Right - $nd, $notchRect.Bottom - $nd, $nd, $nd, 0, 90)
$notchPath.AddArc($notchRect.X, $notchRect.Bottom - $nd, $nd, $nd, 90, 90)
$notchPath.CloseFigure()
$g.FillPath($notchBrush, $notchPath)

$g.Dispose()
$bg.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bg.Dispose()
$fg.Dispose()
Write-Host "Composite saved successfully to $outputPath"
