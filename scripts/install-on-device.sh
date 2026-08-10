#!/usr/bin/env bash
#
# Builds a standalone Release app and installs it on a connected iPhone.
#
# Why this exists rather than plain `expo run:ios --device --configuration
# Release`: that command builds correctly and then fails to install with
# "ApplicationVerificationFailed". The cause is upstream — the Expo build script
# that swaps ExpoModulesWorklets.framework for its Release slice runs after the
# embed-and-sign phase, so that one framework reaches the device unsigned while
# every other prebuilt framework is fine. iOS refuses the whole app for it.
#
# So: build, sign anything that came out unsigned, re-sign the app around it,
# install. Delete this script the day the upstream build script signs its own
# output.
#
# Release, not debug: a debug build fetches its JavaScript from Metro over the
# network, which means the app only works next to the machine that built it.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building (this takes a few minutes the first time)"
# The install step is expected to fail; the build before it is what we want.
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 \
  npx expo run:ios --device --configuration Release || true

APP=$(find ~/Library/Developer/Xcode/DerivedData -maxdepth 5 -type d \
  -path "*Saporium*/Build/Products/Release-iphoneos/Saporium.app" 2>/dev/null | head -1)

if [ -z "$APP" ]; then
  echo "No Release build found. Did the build fail for a different reason?" >&2
  exit 1
fi

IDENTITY=$(security find-identity -p codesigning -v | awk '/Apple Development/{print $2; exit}')
if [ -z "$IDENTITY" ]; then
  echo "No Apple Development certificate in the keychain. Add your Apple ID in" >&2
  echo "Xcode → Settings → Accounts, then open ios/Saporium.xcworkspace once." >&2
  exit 1
fi

echo "==> Signing frameworks that came out unsigned"
signed_any=false
for framework in "$APP"/Frameworks/*.framework; do
  if ! codesign -dv "$framework" >/dev/null 2>&1; then
    echo "    $(basename "$framework")"
    codesign --force --sign "$IDENTITY" --timestamp=none "$framework"
    signed_any=true
  fi
done

if [ "$signed_any" = true ]; then
  # Changing anything inside the bundle invalidates the outer signature.
  entitlements=$(mktemp -t saporium-entitlements)
  codesign -d --entitlements "$entitlements" --xml "$APP" 2>/dev/null
  codesign --force --sign "$IDENTITY" --entitlements "$entitlements" --timestamp=none "$APP"
  rm -f "$entitlements"
  codesign --verify --deep --strict "$APP"
else
  echo "    none — upstream may have fixed this, try plain expo run:ios"
fi

DEVICE=$(xcrun devicectl list devices 2>/dev/null | awk '/connected/{print $3; exit}')
if [ -z "$DEVICE" ]; then
  echo "No connected device. Plug the iPhone in and unlock it." >&2
  exit 1
fi

echo "==> Installing"
xcrun devicectl device install app --device "$DEVICE" "$APP"

echo
echo "Done. If the app refuses to open, trust the developer profile on the phone:"
echo "Settings → General → VPN & Device Management → your Apple ID → Trust."
echo "The free provisioning profile expires after 7 days; rerun this to renew it."
