---
name: restart-dashboard
description: Edit dashboard UI files and restart the dashboard with a full process kill cycle. Use when making changes to dashboard.html or dashboard.js, or when the user says "restart dash", "reload dashboard", or "restart the dashboard".
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# Restart Dashboard

The dashboard caches `dashboard.html` at startup (`fs.readFileSync` in dashboard.js line 28). Edits to HTML/JS files are NOT picked up until the process is fully killed and restarted. On Windows, `pkill` does not reliably kill the process — you must find and kill the exact PID on port 7331.

## Steps

1. **Make your edits** to `dashboard.html` and/or `dashboard.js`

2. **Kill the dashboard by PID and relaunch** (one-liner):
   ```bash
   PID=$(netstat -ano | grep ":7331" | grep LISTEN | awk '{print $5}') && taskkill //PID $PID //F; sleep 2; cd ~/.squad && nohup node dashboard.js > /dev/null 2>&1 &
   ```

3. **Verify it's serving the new content**:
   ```bash
   sleep 1 && curl -s -o /dev/null -w "%{http_code}" http://localhost:7331
   ```

4. **Tell the user to hard refresh** (Ctrl+Shift+R) to bypass browser cache.

## Important

- Do NOT use `pkill -f "node.*dashboard.js"` — it does not reliably kill the process on Windows and leaves zombie processes holding the port
- Always kill by PID found via `netstat -ano | grep ":7331" | grep LISTEN`
- If the old content is still served after restart, check `netstat` again — a zombie may still hold the port
- The dashboard also caches `config.json` at startup, so config changes need a restart too
