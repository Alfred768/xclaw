#!/bin/bash

# Post-installation script for XClaw on Linux

set -e

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database -q /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi

# Create symbolic link for CLI access (optional)
if [ -x /opt/XClaw/clawx ]; then
    ln -sf /opt/XClaw/clawx /usr/local/bin/clawx 2>/dev/null || true
fi

echo "XClaw has been installed successfully."
