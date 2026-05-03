/**
 * Serverless function - proxy do GitHub Actions API
 * Wysyła zatwierdzenia do GitHub Actions workflow (approve-incidents.yml)
 * 
 * Token przechowywany w Vercel Environment Variables (bezpieczny)
 * Frontend wysyła: POST /api/approve { incident_ids: "id1,id2,id3" }
 */

export default async function handler(req, res) {
  // CORS - zezwól requestom z monitoringobywatelski.pl
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { incident_ids, secret } = req.body;
  const token = process.env.GITHUB_TOKEN;
  const apiSecret = process.env.ADMIN_SECRET;

  if (apiSecret && secret !== apiSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!incident_ids || !token) {
    return res.status(400).json({ 
      error: 'Missing incident_ids or GITHUB_TOKEN env var',
      hasToken: !!token,
      hasIds: !!incident_ids
    });
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/michalstankiewicz4-cell/monitoringobywatelski/actions/workflows/approve-incidents.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { incident_ids }
        })
      }
    );

    if (response.status === 204) {
      return res.status(200).json({ 
        success: true, 
        message: 'Workflow triggered successfully',
        ids: incident_ids
      });
    } else {
      const errBody = await response.text();
      console.error('GitHub API error:', response.status, errBody);
      return res.status(response.status).json({ 
        error: `GitHub API error: ${response.status}`,
        details: errBody
      });
    }
  } catch (err) {
    console.error('Vercel function error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
}
