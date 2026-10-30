@echo off
title Campus Hub - Share Live Worldwide (Public HTTPS Link)
echo =====================================================================
echo    Campus Hub - Allenhouse Institute of Technology
echo    Chief Administrator: UTKARSH KUSHWAHA
echo    1-Click Public Link Generator (Cloudflare Tunnel)
echo =====================================================================
echo.
echo Starting secure tunnel to your local Campus Hub server (Port 8000)...
echo No port forwarding or router setup required!
echo.
echo Share the public HTTPS link generated below with anyone worldwide.
echo When they sign in or send a message from their laptop, it will hit
echo your laptop directly in real time!
echo.
echo ---------------------------------------------------------------------
npx cloudflared tunnel --url http://127.0.0.1:8000
pause
