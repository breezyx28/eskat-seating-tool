# Deploy workflow — setup guide

The workflow at [`.github/workflows/deploy.yml`](./deploy.yml) builds the app on every push to `master` and syncs the contents of `dist/` directly into `/var/www/html/eskat` on `eskat.kat-jr.com` over SSH.

Before the first run, complete the two steps below.

---

## 1. Prepare the server (one-time)

SSH into `eskat.kat-jr.com` and run:

```bash
# Create the web root
sudo mkdir -p /var/www/html/eskat

# Create a dedicated deploy user (recommended)
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo touch /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# Give the deploy user ownership of the target directory
sudo chown -R deploy:deploy /var/www/html/eskat

# Allow the deploy user to reload nginx without a password (only this one command)
echo 'deploy ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx' | sudo tee /etc/sudoers.d/deploy-nginx
sudo chmod 440 /etc/sudoers.d/deploy-nginx
```

### Generate the deploy SSH key (on your local machine)

```bash
ssh-keygen -t ed25519 -C "github-actions-eskat" -f ~/.ssh/eskat_deploy -N ""
# Public  key: ~/.ssh/eskat_deploy.pub   (append to the server's authorized_keys)
# Private key: ~/.ssh/eskat_deploy       (paste into GitHub secret SSH_PRIVATE_KEY)
```

Append the public key to the server:

```bash
ssh-copy-id -i ~/.ssh/eskat_deploy.pub deploy@eskat.kat-jr.com
# or manually:
#   cat ~/.ssh/eskat_deploy.pub | ssh root@eskat.kat-jr.com \
#     "cat >> /home/deploy/.ssh/authorized_keys"
```

Test it:

```bash
ssh -i ~/.ssh/eskat_deploy deploy@eskat.kat-jr.com "echo ok && ls /var/www/html/eskat"
```

### Nginx vhost

`/etc/nginx/sites-available/eskat.kat-jr.com`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name eskat.kat-jr.com;

    # Redirect to HTTPS (after certbot)
    # return 301 https://$host$request_uri;

    root /var/www/html/eskat;
    index index.html;

    # SPA fallback — React Router needs this
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-cache hashed Vite assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

After Certbot, your `listen 443 ssl` server block should also send **browser security headers**. Add inside the same `server { … }` that serves TLS (adjust `max-age` once you are confident nothing breaks):

```nginx
    # --- Browser security (tune CSP before enforcing) ---
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Phase 1: log violations only (Chrome DevTools → Console / Reports)
    add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;

    # Phase 2: after zero violations in production, swap Report-Only for enforce:
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;
```

If you embed third-party scripts or APIs later, extend `script-src` / `connect-src` accordingly, then `nginx -t` and reload.

### Chrome still says “broken HTTPS” on production

Your **document** TLS can be valid while the Security tab complains about **one bad subresource** or an old **“allow insecure content”** override.

1. Open exactly **`https://eskat.kat-jr.com`** (not `http://`, not a different host).
2. DevTools → **Network** → reload → note any **red** row or “mixed content” / certificate error; copy the **Request URL** (no secrets).
3. Chrome → **Site settings** for that origin → **Reset permissions**; retry in **Incognito** with extensions disabled.
4. Ensure no hosting panel injects analytics or “optimisation” scripts over `http://` or a host with a broken cert.

Enable & reload:

```bash
sudo ln -s /etc/nginx/sites-available/eskat.kat-jr.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS (Let's Encrypt)
sudo certbot --nginx -d eskat.kat-jr.com
```

> The workflow writes the built files **directly** into `/var/www/html/eskat/`. Point nginx's `root` at that folder — not at a sub-folder like `dist/` or `current/`.

---

## 2. Add GitHub secrets

In your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret            | Required | Value                                                                                          |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `SSH_USER`        | ✅       | e.g. `deploy`                                                                                  |
| `SSH_PRIVATE_KEY` | ✅       | Full contents of `~/.ssh/eskat_deploy` (including `-----BEGIN/END OPENSSH PRIVATE KEY-----`) |

> SSH runs on the default port `22`. If your server ever moves to a non-standard port, add a `-p <port>` flag to the `ssh-keyscan`, `ssh`, and `rsync -e "ssh ..."` invocations in the workflow.

> **Host key handling** — the workflow runs `ssh-keyscan` against `eskat.kat-jr.com` at the start of every deploy and writes the result to the runner's `~/.ssh/known_hosts` for that run only. No `SSH_KNOWN_HOSTS` secret is required.
>
> This is safer than `StrictHostKeyChecking=no` (which accepts any key) because SSH still verifies that the server responding during `rsync` is the same one that was scanned at the top of the run. If you later want the strongest possible guarantee against DNS hijacking, capture the output of `ssh-keyscan -t ed25519,rsa eskat.kat-jr.com` once and add it as a `SSH_KNOWN_HOSTS` secret — the workflow can be switched back to pin-mode easily.

---

## 3. Run the deploy

Either:

- **Push to `master`** — it runs automatically.
- **Actions tab → Deploy to eskat.kat-jr.com → Run workflow** — manual trigger.

The workflow:

1. Checks out the repo
2. Sets up Bun and installs dependencies with the frozen lockfile
3. Runs `tsc --noEmit` as a type-check gate
4. Builds the production bundle (`bun run build` → `dist/`)
5. Rsyncs **the contents of `dist/`** into `/var/www/html/eskat/` (trailing slash on the source path means "contents, not folder")
6. Uses `--delete` so files removed between builds (e.g. old hashed assets) are pruned from the server
7. Reloads nginx (best-effort, won't fail the deploy if sudoers isn't set)
8. Fails the job if `dist/` contains disallowed `http://` URLs (see workflow step; SVG `xmlns` is allow-listed)

### What ends up on the server

```
/var/www/html/eskat/
├── index.html
├── assets/
│   ├── index-<hash>.js
│   ├── index-<hash>.css
│   └── ...
└── ...any public/ files
```

Everything that was in `dist/` is now directly under `/var/www/html/eskat`.

---

## Rollback

Since there is no `releases/` folder kept on disk, rollback is done through git — revert the bad commit and the workflow redeploys the previous state:

```bash
git revert <bad-commit>
git push origin master
```

The action will rebuild and sync the reverted version in a couple of minutes.

> If you want on-disk rollbacks (instant, no rebuild), switch back to a symlinked-releases deploy strategy — but that is deliberately removed here for the simple flat layout.

---

## Troubleshooting

- **`Permission denied (publickey)`** — the public key isn't in `/home/<user>/.ssh/authorized_keys`, or file permissions are wrong (must be `700` on `.ssh`, `600` on `authorized_keys`).
- **`Host key verification failed`** — regenerate `SSH_KNOWN_HOSTS` (the server key changed, e.g. after an OS reinstall).
- **`rsync: mkdir failed: Permission denied`** — the deploy user doesn't own `/var/www/html/eskat`. Re-run the `chown` in step 1.
- **404 on homepage** — nginx `root` is pointing at the wrong path. It must be `/var/www/html/eskat`.
- **404 on a sub-route like `/playground`** — `try_files $uri $uri/ /index.html;` is missing from the nginx config.
- **`sudo: a password is required` during nginx reload** — the sudoers drop-in from step 1 wasn't created, or the username in it doesn't match `SSH_USER`. The workflow ignores this failure, so it's non-blocking; fix it when convenient.
- **Old files still showing after deploy** — browser cache. The `--delete` flag ensures the server is clean; force-refresh the browser (`Ctrl+Shift+R`) to confirm.
