import { Express, Request, Response } from 'express';

export async function seedDatabaseIfEmpty() {
  // Firestore is used directly by client app
}

export function registerApiRoutes(app: Express) {
  // GOOGLE OAUTH ROUTES
  app.get('/api/auth/google', (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).send(`
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
          <h2>GOOGLE_CLIENT_ID não configurado</h2>
          <p>Configure a variável GOOGLE_CLIENT_ID para habilitar o login com o Google.</p>
        </div>
      `);
    }
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account`;

    res.redirect(authUrl);
  });

  app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
    const { code, error } = req.query;
    if (error || !code) {
      return res.status(400).send(`Erro no login com Google: ${error || 'Código de autorização ausente.'}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId || '',
          client_secret: clientSecret || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('Google token exchange error:', tokenData);
        return res.status(400).send('Falha na troca de código com o Google.');
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await userRes.json();

      if (!googleUser.email) {
        return res.status(400).send('Não foi possível obter o e-mail do Google.');
      }

      const email = String(googleUser.email).toLowerCase();
      const name = googleUser.name || email.split('@')[0];

      const userObj = {
        id: 'google_' + (googleUser.id || Date.now()),
        name,
        username: email,
        role: 'admin',
      };

      const authUserJson = JSON.stringify(userObj);

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Autenticado com Sucesso</title>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: white;">
          <div style="background: #1e293b; padding: 24px; border-radius: 16px; text-align: center; max-width: 360px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-size: 36px; margin-bottom: 12px;">✅</div>
            <h2 style="margin: 0 0 8px 0; font-size: 18px;">Autenticado com Sucesso!</h2>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">Redirecionando para o sistema...</p>
          </div>
          <script>
            try {
              window.localStorage.setItem('escala_offshore_official_session_v3', ${JSON.stringify(authUserJson)});
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: ${authUserJson} }, '*');
                setTimeout(() => window.close(), 500);
              } else {
                setTimeout(() => { window.location.href = '/'; }, 600);
              }
            } catch (err) {
              window.location.href = '/login';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Google callback error:', err);
      res.status(500).send(`Erro interno ao processar login com Google: ${err.message}`);
    }
  });
}

