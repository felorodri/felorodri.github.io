@echo off
set currentPath=%cd%
cd server_app
node fileWatcher.js

pause