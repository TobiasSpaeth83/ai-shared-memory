const { App } = require('@octokit/app');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('❌ config.json nicht gefunden!');
    console.log('Bitte kopiere config.template.json zu config.json und fülle die Werte aus.');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Load private key
const privateKeyPath = path.join(__dirname, config.app.private_key_path || 'private-key.pem');
if (!fs.existsSync(privateKeyPath)) {
    console.error('❌ Private Key nicht gefunden!');
    console.log(`Erwarteter Pfad: ${privateKeyPath}`);
    console.log('Bitte lade den Private Key herunter und speichere ihn als private-key.pem');
    process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

async function testConnection() {
    try {
        console.log('🔄 Teste GitHub App Verbindung...\n');
        
        // Create app instance
        const app = new App({
            appId: config.app.app_id,
            privateKey: privateKey,
        });

        // Get installation
        const octokit = await app.getInstallationOctokit(config.app.installation_id);
        
        // Test: Get repository info
        const { data: repo } = await octokit.rest.repos.get({
            owner: config.repository.owner,
            repo: config.repository.repo
        });
        
        console.log('✅ Verbindung erfolgreich!\n');
        console.log('📊 Repository Info:');
        console.log(`  Name: ${repo.full_name}`);
        console.log(`  Beschreibung: ${repo.description}`);
        console.log(`  Private: ${repo.private}`);
        console.log(`  Default Branch: ${repo.default_branch}`);
        
        // Test: List recent commits
        const { data: commits } = await octokit.rest.repos.listCommits({
            owner: config.repository.owner,
            repo: config.repository.repo,
            per_page: 3
        });
        
        console.log('\n📝 Letzte Commits:');
        commits.forEach(commit => {
            console.log(`  - ${commit.sha.substring(0, 7)}: ${commit.commit.message.split('\n')[0]}`);
        });
        
        console.log('\n✅ GitHub App ist bereit!');
        console.log('Du kannst jetzt ChatGPT "GO" sagen.');
        
    } catch (error) {
        console.error('❌ Fehler bei der Verbindung:');
        console.error(error.message);
        
        if (error.status === 401) {
            console.log('\n💡 Mögliche Ursachen:');
            console.log('  - App ID ist falsch');
            console.log('  - Private Key passt nicht zur App');
        } else if (error.status === 404) {
            console.log('\n💡 Mögliche Ursachen:');
            console.log('  - Installation ID ist falsch');
            console.log('  - App ist nicht auf dem Repository installiert');
        }
    }
}

testConnection();