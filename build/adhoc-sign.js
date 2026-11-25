// Ad-hoc sign the macOS app after packaging.
// Apple Silicon refuses to launch completely unsigned apps ("is damaged and can't be opened").
// An ad-hoc signature isn't a paid Developer ID, but it lets the app open via
// System Settings → Privacy & Security → Open Anyway.
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
};
