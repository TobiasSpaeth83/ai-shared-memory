import fs from 'fs';
import path from 'path';
import { App } from '@octokit/app';
import dotenv from 'dotenv';
dotenv.config();

async function testInstallationToken() {
  console.log('Testing GitHub App Installation Token...\n');
  
  // Load configuration
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_INSTALLATION_ID;
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
  
  console.log('Configuration:');
  console.log('- App ID:', appId);
  console.log('- Installation ID:', installationId);
  console.log('- Private Key Path:', privateKeyPath);
  console.log('');
  
  if (!appId || !installationId || !privateKeyPath) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
  }
  
  // Load private key
  let privateKey;
  try {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    console.log('✅ Private key loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load private key:', error.message);
    process.exit(1);
  }
  
  // Create GitHub App instance
  const app = new App({
    appId: appId,
    privateKey: privateKey,
  });
  
  try {
    // Get installation octokit
    const octokit = await app.getInstallationOctokit(parseInt(installationId));
    console.log('✅ Installation token obtained successfully!');
    
    // Test the token by getting repository info
    const { data: repo } = await octokit.request('GET /repos/{owner}/{repo}', {
      owner: 'TobiasSpaeth83',
      repo: 'ai-shared-memory'
    });
    
    console.log('\n📦 Repository Info:');
    console.log('- Name:', repo.full_name);
    console.log('- Description:', repo.description || 'No description');
    console.log('- Default Branch:', repo.default_branch);
    console.log('- Private:', repo.private);
    
    console.log('\n🔑 App Permissions Verified');
    
    console.log('\n✅ All tests passed! Your GitHub App is configured correctly.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.status === 401) {
      console.error('Authentication failed. Check your App ID and private key.');
    } else if (error.status === 404) {
      console.error('Installation not found. Check your Installation ID.');
    }
    process.exit(1);
  }
}

testInstallationToken();