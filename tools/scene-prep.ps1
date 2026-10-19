# 장면 숨은그림 자산 준비 (2026-10-19)
#  1) icons/hidden/*.png → icons/hiddenL/*.png : 흰 속을 투명하게 한 '선만' 판(2·3단계에서 장면 선과 섞이게)
#  2) icons/scenes/*.png 의 선 밀도 격자(32×21칸, 칸마다 0~9)를 출력 → tasks.js 의 SCENE_DENS 에 붙여 넣기
# 사용: powershell -ExecutionPolicy Bypass -File tools\scene-prep.ps1
$root = Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class ScenePrep {
  static byte[] Read(Bitmap b, out BitmapData d) {
    d = b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    byte[] px = new byte[d.Stride*b.Height]; Marshal.Copy(d.Scan0, px, 0, px.Length); return px;
  }
  public static void LineOnly(string src, string dst) {
    using (var b0 = new Bitmap(src)) using (var b = new Bitmap(b0.Width, b0.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(b)) g.DrawImage(b0, 0, 0, b0.Width, b0.Height);
      BitmapData d; byte[] p = Read(b, out d);
      for (int i = 0; i < p.Length; i += 4) {
        int lum = (p[i] + p[i+1] + p[i+2]) / 3;           // B G R
        int a = p[i+3] * (255 - lum) / 255;                 // 어두울수록 불투명
        a = Math.Min(255, a * 12 / 5);                      // 장면 선처럼 진하게
        p[i] = p[i+1] = p[i+2] = 0; p[i+3] = (byte)a;
      }
      Marshal.Copy(p, 0, d.Scan0, p.Length); b.UnlockBits(d); b.Save(dst, ImageFormat.Png);
    }
  }
  public static string Density(string src, int cols, int rows) {
    using (var b0 = new Bitmap(src)) using (var b = new Bitmap(b0.Width, b0.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(b)) g.DrawImage(b0, 0, 0, b0.Width, b0.Height);
      BitmapData d; byte[] p = Read(b, out d); int W = b.Width, H = b.Height;
      var sb = new System.Text.StringBuilder();
      for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) {
        int x0 = c*W/cols, x1 = (c+1)*W/cols, y0 = r*H/rows, y1 = (r+1)*H/rows, dark = 0, n = 0;
        for (int y = y0; y < y1; y += 2) for (int x = x0; x < x1; x += 2) { int i = y*d.Stride + x*4; if ((p[i]+p[i+1]+p[i+2])/3 < 128) dark++; n++; }
        sb.Append(Math.Min(9, dark * 40 / Math.Max(1, n)));
      }
      b.UnlockBits(d); return sb.ToString();
    }
  }
}
"@
foreach ($f in Get-ChildItem "$root\icons\hidden\*.png") { [ScenePrep]::LineOnly($f.FullName, "$root\icons\hiddenL\$($f.Name)") }
foreach ($f in Get-ChildItem "$root\icons\scenes\*.png") { "    $($f.BaseName): `"$([ScenePrep]::Density($f.FullName, 32, 21))`"," }
