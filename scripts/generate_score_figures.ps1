param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\docs\assets")
)

Add-Type -AssemblyName System.Drawing

$width = 2400
$height = 1500
$collisionRadius = 0.42
$dangerRadius = 0.75
$safeRadius = 3.0
$maxDistance = 10.0
$step = 0.01

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$data = for ($i = 0; $i -le [int]($maxDistance / $step); $i++) {
  $distance = $i * $step
  $sciencePotential = if ($distance -lt $collisionRadius) {
    0.0
  } else {
    [Math]::Exp(-[Math]::Pow($distance - 1.0, 2) / (2 * [Math]::Pow(2.5, 2)))
  }
  $x = [Math]::Min(1.0, [Math]::Max(0.0, ($distance - $dangerRadius) / ($safeRadius - $dangerRadius)))
  $safetyPotential = $x * $x * (3 - 2 * $x)
  [PSCustomObject]@{
    DistanceKm = $distance
    SciencePotential = $sciencePotential
    SafetyPotential = $safetyPotential
    SciencePoints = 50 * $sciencePotential
    SafetyPoints = 50 * $safetyPotential
    TotalPoints = 50 * ($sciencePotential + $safetyPotential)
  }
}

$data | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $OutputDirectory "score-potential-data.csv")
$best = $data | Sort-Object TotalPoints -Descending | Select-Object -First 1

function New-Canvas {
  $bitmap = [System.Drawing.Bitmap]::new($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::White)
  return @($bitmap, $graphics)
}

function Draw-Text {
  param($Graphics, [string]$Text, [float]$X, [float]$Y, [float]$Size, [System.Drawing.Color]$Color, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular)
  $font = [System.Drawing.Font]::new("Yu Gothic UI", $Size, $Style)
  $brush = [System.Drawing.SolidBrush]::new($Color)
  $Graphics.DrawString($Text, $font, $brush, $X, $Y)
  $font.Dispose()
  $brush.Dispose()
}

function Draw-LineSeries {
  param($Graphics, $Values, [scriptblock]$XMap, [scriptblock]$YMap, [System.Drawing.Color]$Color, [float]$Width)
  $pen = [System.Drawing.Pen]::new($Color, $Width)
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  for ($i = 1; $i -lt $Values.Count; $i++) {
    $Graphics.DrawLine(
      $pen,
      [float](& $XMap $Values[$i - 1]),
      [float](& $YMap $Values[$i - 1]),
      [float](& $XMap $Values[$i]),
      [float](& $YMap $Values[$i])
    )
  }
  $pen.Dispose()
}

$scienceColor = [System.Drawing.Color]::FromArgb(221, 95, 44)
$safetyColor = [System.Drawing.Color]::FromArgb(22, 133, 112)
$totalColor = [System.Drawing.Color]::FromArgb(35, 82, 151)
$gridColor = [System.Drawing.Color]::FromArgb(220, 225, 230)
$axisColor = [System.Drawing.Color]::FromArgb(45, 55, 65)
$mutedColor = [System.Drawing.Color]::FromArgb(90, 100, 110)

# Figure 1: score curves versus center distance.
$canvas = New-Canvas
$bitmap = $canvas[0]
$g = $canvas[1]
$left = 220.0
$top = 210.0
$plotWidth = 1960.0
$plotHeight = 1040.0
$xMap = { param($p) $left + ($p.DistanceKm / $maxDistance) * $plotWidth }
$yMap = { param($value) $top + $plotHeight - ($value / 100.0) * $plotHeight }

Draw-Text $g "Score potentials versus center distance" 150 55 46 $axisColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Exact curves used by src/lib/scoring.ts (single-point distribution assumption)" 154 122 25 $mutedColor

for ($score = 0; $score -le 100; $score += 10) {
  $y = & $yMap $score
  $pen = [System.Drawing.Pen]::new($gridColor, 2)
  $g.DrawLine($pen, $left, $y, $left + $plotWidth, $y)
  $pen.Dispose()
  Draw-Text $g "$score" 125 ($y - 17) 21 $mutedColor
}
for ($distance = 0; $distance -le 10; $distance += 1) {
  $x = $left + ($distance / $maxDistance) * $plotWidth
  $pen = [System.Drawing.Pen]::new($gridColor, 2)
  $g.DrawLine($pen, $x, $top, $x, $top + $plotHeight)
  $pen.Dispose()
  Draw-Text $g "$distance" ($x - 12) ($top + $plotHeight + 18) 21 $mutedColor
}

$axisPen = [System.Drawing.Pen]::new($axisColor, 3)
$g.DrawLine($axisPen, $left, $top, $left, $top + $plotHeight)
$g.DrawLine($axisPen, $left, $top + $plotHeight, $left + $plotWidth, $top + $plotHeight)
$axisPen.Dispose()

Draw-LineSeries $g $data $xMap { param($p) $top + $plotHeight - ($p.SciencePoints / 100.0) * $plotHeight } $scienceColor 7
Draw-LineSeries $g $data $xMap { param($p) $top + $plotHeight - ($p.SafetyPoints / 100.0) * $plotHeight } $safetyColor 7
Draw-LineSeries $g $data $xMap { param($p) $top + $plotHeight - ($p.TotalPoints / 100.0) * $plotHeight } $totalColor 8

foreach ($distance in @($dangerRadius, 1.0, $safeRadius, $best.DistanceKm)) {
  $x = $left + ($distance / $maxDistance) * $plotWidth
  $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(130, 90, 100, 110), 3)
  $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
  $g.DrawLine($pen, $x, $top, $x, $top + $plotHeight)
  $pen.Dispose()
}

Draw-Text $g "Center distance [km]" 1000 1345 27 $axisColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Score [points]" 130 170 24 $axisColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Scientific value (max 50)" 1550 70 24 $scienceColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Safety (max 50)" 1550 108 24 $safetyColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Total score" 1550 146 24 $totalColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g ("Maximum total: {0:N2} points at {1:N2} km" -f $best.TotalPoints, $best.DistanceKm) 145 1410 25 $axisColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "The 59-point cap for a 3-sigma danger-zone overlap is not included in these point-distance curves." 990 1410 21 $mutedColor

$bitmap.Save((Join-Path $OutputDirectory "score-potential-vs-distance.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bitmap.Dispose()

# Figure 2: parametric trade-off curve.
$canvas = New-Canvas
$bitmap = $canvas[0]
$g = $canvas[1]
$left = 245.0
$top = 205.0
$plotWidth = 1580.0
$plotHeight = 1080.0
$xScoreMap = { param($value) $left + ($value / 50.0) * $plotWidth }
$yScoreMap = { param($value) $top + $plotHeight - ($value / 50.0) * $plotHeight }

Draw-Text $g "Trade-off between scientific value and safety" 150 55 46 $axisColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Each point represents one center distance from 0 to 10 km; labels show selected distances." 154 122 25 $mutedColor

for ($score = 0; $score -le 50; $score += 5) {
  $x = & $xScoreMap $score
  $y = & $yScoreMap $score
  $pen = [System.Drawing.Pen]::new($gridColor, 2)
  $g.DrawLine($pen, $x, $top, $x, $top + $plotHeight)
  $g.DrawLine($pen, $left, $y, $left + $plotWidth, $y)
  $pen.Dispose()
  Draw-Text $g "$score" ($x - 12) ($top + $plotHeight + 18) 20 $mutedColor
  Draw-Text $g "$score" 172 ($y - 16) 20 $mutedColor
}
$axisPen = [System.Drawing.Pen]::new($axisColor, 3)
$g.DrawLine($axisPen, $left, $top, $left, $top + $plotHeight)
$g.DrawLine($axisPen, $left, $top + $plotHeight, $left + $plotWidth, $top + $plotHeight)
$axisPen.Dispose()

Draw-LineSeries $g $data { param($p) $left + ($p.SciencePoints / 50.0) * $plotWidth } { param($p) $top + $plotHeight - ($p.SafetyPoints / 50.0) * $plotHeight } $totalColor 5

foreach ($point in $data) {
  $ratio = $point.DistanceKm / $maxDistance
  $color = [System.Drawing.Color]::FromArgb(220, [int](220 - 170 * $ratio), [int](90 + 80 * $ratio), [int](55 + 160 * $ratio))
  $brush = [System.Drawing.SolidBrush]::new($color)
  $x = & $xScoreMap $point.SciencePoints
  $y = & $yScoreMap $point.SafetyPoints
  $g.FillEllipse($brush, $x - 4, $y - 4, 8, 8)
  $brush.Dispose()
}

foreach ($distance in @(0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0)) {
  $point = $data[[int]($distance / $step)]
  $x = & $xScoreMap $point.SciencePoints
  $y = & $yScoreMap $point.SafetyPoints
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $pen = [System.Drawing.Pen]::new($axisColor, 3)
  $g.FillEllipse($brush, $x - 8, $y - 8, 16, 16)
  $g.DrawEllipse($pen, $x - 8, $y - 8, 16, 16)
  $brush.Dispose()
  $pen.Dispose()
  Draw-Text $g ("{0:g} km" -f $distance) ($x + 12) ($y - 22) 19 $axisColor ([System.Drawing.FontStyle]::Bold)
}

Draw-Text $g "Scientific value score [points]" 800 1380 27 $scienceColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Safety score [points]" 155 160 24 $safetyColor ([System.Drawing.FontStyle]::Bold)
Draw-Text $g "Upper-right would mean both scores are high, but the current distance potentials do not reach (50, 50)." 143 1435 23 $mutedColor

$bitmap.Save((Join-Path $OutputDirectory "science-safety-tradeoff.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bitmap.Dispose()

function Get-HeatColor {
  param([double]$Value)
  $v = [Math]::Min(1.0, [Math]::Max(0.0, $Value))
  if ($v -lt 0.25) {
    $t = $v / 0.25
    return [System.Drawing.Color]::FromArgb(255, [int](11 + 18 * $t), [int](28 + 58 * $t), [int](55 + 79 * $t))
  }
  if ($v -lt 0.5) {
    $t = ($v - 0.25) / 0.25
    return [System.Drawing.Color]::FromArgb(255, [int](29 + 35 * $t), [int](86 + 69 * $t), [int](134 + 45 * $t))
  }
  if ($v -lt 0.75) {
    $t = ($v - 0.5) / 0.25
    return [System.Drawing.Color]::FromArgb(255, [int](64 + 119 * $t), [int](155 + 45 * $t), [int](179 - 70 * $t))
  }
  $t = ($v - 0.75) / 0.25
  return [System.Drawing.Color]::FromArgb(255, [int](183 + 69 * $t), [int](200 + 35 * $t), [int](109 - 60 * $t))
}

function New-BPlaneContour {
  param(
    [string]$FileName,
    [string]$Title,
    [string]$Subtitle,
    [scriptblock]$Potential
  )

  $mapSize = 900
  $marginLeft = 190
  $marginTop = 185
  $canvasWidth = 1320
  $canvasHeight = 1220
  $rangeKm = 6.0
  $bitmap = [System.Drawing.Bitmap]::new($canvasWidth, $canvasHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::White)

  for ($py = 0; $py -lt $mapSize; $py++) {
    $zKm = $rangeKm - (2 * $rangeKm * $py / ($mapSize - 1))
    for ($px = 0; $px -lt $mapSize; $px++) {
      $yKm = -$rangeKm + (2 * $rangeKm * $px / ($mapSize - 1))
      $distance = [Math]::Sqrt($yKm * $yKm + $zKm * $zKm)
      $value = & $Potential $distance
      $bitmap.SetPixel($marginLeft + $px, $marginTop + $py, (Get-HeatColor $value))
    }
  }

  Draw-Text $graphics $Title 110 40 39 $axisColor ([System.Drawing.FontStyle]::Bold)
  Draw-Text $graphics $Subtitle 114 102 21 $mutedColor

  $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(110, 240, 247, 250), 1)
  $axisPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 255, 255, 255), 3)
  for ($km = -6; $km -le 6; $km += 1) {
    $p = $marginLeft + (($km + $rangeKm) / (2 * $rangeKm)) * $mapSize
    $graphics.DrawLine($gridPen, $p, $marginTop, $p, $marginTop + $mapSize)
    $graphics.DrawLine($gridPen, $marginLeft, $p, $marginLeft + $mapSize, $p)
    Draw-Text $graphics "$km" ($p - 10) ($marginTop + $mapSize + 12) 16 $mutedColor
    Draw-Text $graphics "$(-$km)" ($marginLeft - 42) ($p - 12) 16 $mutedColor
  }
  $center = $marginLeft + $mapSize / 2
  $graphics.DrawLine($axisPen, $center, $marginTop, $center, $marginTop + $mapSize)
  $graphics.DrawLine($axisPen, $marginLeft, $center, $marginLeft + $mapSize, $center)

  foreach ($radius in @($collisionRadius, $dangerRadius, 1.0, 2.0, 3.0, 5.0)) {
    $radiusPx = $radius / (2 * $rangeKm) * $mapSize
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 255, 255, 255), 2)
    $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $graphics.DrawEllipse($pen, $center - $radiusPx, $center - $radiusPx, 2 * $radiusPx, 2 * $radiusPx)
    $pen.Dispose()
  }

  for ($barY = 0; $barY -lt 500; $barY++) {
    $value = 1 - $barY / 499
    $brush = [System.Drawing.SolidBrush]::new((Get-HeatColor $value))
    $graphics.FillRectangle($brush, 1140, 270 + $barY, 38, 1)
    $brush.Dispose()
  }
  Draw-Text $graphics "1.0" 1190 252 18 $mutedColor
  Draw-Text $graphics "0.5" 1190 500 18 $mutedColor
  Draw-Text $graphics "0.0" 1190 748 18 $mutedColor
  Draw-Text $graphics "Potential" 1120 210 19 $axisColor ([System.Drawing.FontStyle]::Bold)
  Draw-Text $graphics "Reference circles" 1120 835 17 $axisColor ([System.Drawing.FontStyle]::Bold)
  Draw-Text $graphics "0.42, 0.75, 1, 2," 1120 870 16 $mutedColor
  Draw-Text $graphics "3, and 5 km" 1120 900 16 $mutedColor
  Draw-Text $graphics "B-plane Y [km]" 550 1140 22 $axisColor ([System.Drawing.FontStyle]::Bold)
  Draw-Text $graphics "B-plane Z [km]" 18 145 20 $axisColor ([System.Drawing.FontStyle]::Bold)
  Draw-Text $graphics "White dashed circles: center-distance references (collision 0.42 km, danger 0.75 km)." 110 1180 18 $mutedColor

  $gridPen.Dispose()
  $axisPen.Dispose()
  $bitmap.Save((Join-Path $OutputDirectory $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-BPlaneContour "bplane-scientific-value-contour.png" "B-plane scientific-value potential" "Science is zero inside the 0.42 km collision radius; it peaks near 1 km." {
  param($distance)
  if ($distance -lt $collisionRadius) { return 0.0 }
  return [Math]::Exp(-[Math]::Pow($distance - 1.0, 2) / (2 * [Math]::Pow(2.5, 2)))
}

New-BPlaneContour "bplane-safety-contour.png" "B-plane safety potential" "Safety rises smoothly from the 0.75 km danger radius and reaches 1.0 at 3 km." {
  param($distance)
  $x = [Math]::Min(1.0, [Math]::Max(0.0, ($distance - $dangerRadius) / ($safeRadius - $dangerRadius)))
  return $x * $x * (3 - 2 * $x)
}

New-BPlaneContour "bplane-total-score-contour.png" "B-plane total-score potential" "Point score = 50 x scientific-value potential + 50 x safety potential." {
  param($distance)
  $science = if ($distance -lt $collisionRadius) { 0.0 } else { [Math]::Exp(-[Math]::Pow($distance - 1.0, 2) / (2 * [Math]::Pow(2.5, 2))) }
  $x = [Math]::Min(1.0, [Math]::Max(0.0, ($distance - $dangerRadius) / ($safeRadius - $dangerRadius)))
  $safety = $x * $x * (3 - 2 * $x)
  return ($science + $safety) / 2
}

Write-Output ("Generated figures and CSV in {0}" -f (Resolve-Path $OutputDirectory))
