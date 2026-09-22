Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$blue = [System.Drawing.Color]::FromArgb(255, 98, 155, 253)

function Get-ArtFont([int]$px) {
  foreach ($name in @('Segoe Script', 'Lucida Calligraphy', 'Brush Script MT', 'Gabriola')) {
    try {
      return New-Object System.Drawing.Font($name, $px, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    } catch {}
  }
  return New-Object System.Drawing.Font('Georgia', $px, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
}

function Save-MarkIcon([int]$size, [string]$text, [string]$fileName) {
  $format = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  $bmp = New-Object System.Drawing.Bitmap $size, $size, $format
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $fontPx = [Math]::Floor($size * $(if ($text.Length -gt 1) { 0.34 } else { 0.62 }))
  $font = Get-ArtFont $fontPx
  $brush = New-Object System.Drawing.SolidBrush $blue
  $measured = $g.MeasureString($text, $font)
  $x = ($size - $measured.Width) / 2
  $y = ($size - $measured.Height) / 2
  $g.DrawString($text, $font, $brush, $x, $y)
  $g.DrawString($text, $font, $brush, ($x + 1), $y)
  if ($size -ge 48) {
    $g.DrawString($text, $font, $brush, $x, ($y + 1))
  }

  $path = Join-Path $outDir $fileName
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $font.Dispose()
  $brush.Dispose()
}

Save-MarkIcon 16 'M' 'icon16.png'
Save-MarkIcon 48 'Mark' 'icon48.png'
Save-MarkIcon 128 'Mark' 'icon128.png'
Write-Output 'icons updated'
