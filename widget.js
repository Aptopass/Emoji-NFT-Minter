(function() {
    // Widget initialization function
    function initEmojiNFTWidget(containerId, config = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID "${containerId}" not found.`);
            return;
        }

        // Default configuration
        const defaultConfig = {
            defaultWallet: '',
            defaultName: '',
            width: '400px',
            primaryColor: '#00ffcc'
        };
        const settings = { ...defaultConfig, ...config };

        // Inject HTML
        container.innerHTML = `
            <div class="emoji-nft-widget" style="max-width: ${settings.width}; margin: 0 auto; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); font-family: Arial, sans-serif; color: #fff;">
                <h2 style="text-align: center; margin-bottom: 20px; text-transform: uppercase; font-size: 24px;">Emoji NFT Minter</h2>
                <input type="text" id="widgetUserId" placeholder="Wallet Address" value="${settings.defaultWallet}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: none; border-radius: 5px; background: rgba(255, 255, 255, 0.1); color: #fff;">
                <input type="text" id="widgetUserName" placeholder="Your Name" value="${settings.defaultName}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: none; border-radius: 5px; background: rgba(255, 255, 255, 0.1); color: #fff;">
                <button id="widgetMintBtn" style="width: 100%; padding: 10px; background: ${settings.primaryColor}; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Mint NFT</button>
                <canvas id="widgetTokenCanvas" style="display: none; margin-top: 20px; border-radius: 10px; max-width: 100%;"></canvas>
                <button id="widgetDownloadBtn" style="display: none; width: 100%; padding: 10px; background: ${settings.primaryColor}; color: #fff; border: none; border-radius: 5px; margin-top: 10px; cursor: pointer;">Download Image</button>
            </div>
        `;

        // Core variables
        const emojis = ["😀", "😂", "🤓", "😎", "😍", "🥰", "⭐", "✨", "⚡", "💥", "🔥", "🌈"];
        while (emojis.length < 100) emojis.push("🌟");
        let generatedToken = '';
        let alphaNumericNumber = '';
        let tokenValue = '';
        let timestamp = '';
        let tokenHash = '';
        let downloadCode = '';
        let userIdGlobal = '';
        let userNameGlobal = '';

        // Utility functions
        function generateSecureRandomString(length, chars) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            return Array.from(array).map(x => chars[x % chars.length]).join('');
        }

        async function computeSHA256(text) {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        function seededRandom(seed) {
            let x = parseInt(seed.slice(0, 8), 16);
            return function() {
                x = (x * 1103515245 + 12345) & 0x7fffffff;
                return x / 0x7fffffff;
            };
        }

        function resizeCanvas(canvas) {
            const maxWidth = container.clientWidth * 0.9;
            const aspectRatio = 400 / 320;
            canvas.width = Math.min(maxWidth, 400);
            canvas.height = canvas.width / aspectRatio;
        }

        function drawTokenImage(userId, userName, token, alphaNum, value, timestamp, hash) {
            const canvas = document.getElementById('widgetTokenCanvas');
            const ctx = canvas.getContext('2d');
            resizeCanvas(canvas);
            canvas.style.display = 'block';
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const scale = canvas.width / 400;
            const rand = seededRandom(hash);

            // Gradient background
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, settings.primaryColor);
            gradient.addColorStop(1, '#ff00ff');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Title and hash
            ctx.fillStyle = '#fff';
            ctx.font = `${20 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('EMOJI NFT', canvas.width / 2, 50 * scale);
            ctx.font = `${12 * scale}px Arial`;
            ctx.fillText(hash.slice(0, 8), canvas.width / 2, 300 * scale);

            // Emojis
            const hashNum = parseInt(hash.slice(0, 8), 16);
            const selectedEmojis = [
                emojis[hashNum % emojis.length],
                emojis[(hashNum + 10) % emojis.length],
                emojis[(hashNum + 20) % emojis.length]
            ];
            ctx.font = `${30 * scale}px Arial`;
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.translate(canvas.width / 2, 120 * scale);
                ctx.rotate((rand() - 0.5) * 0.5);
                ctx.fillText(selectedEmojis[i], 0, -60 * scale + i * 30 * scale);
                ctx.restore();
            }

            // Token details
            ctx.font = `${16 * scale}px Arial`;
            ctx.fillText(`${value} Coins`, canvas.width / 2, 180 * scale);
            ctx.font = `${12 * scale}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`ID: ${userId}`, 20 * scale, 220 * scale);
            ctx.fillText(`Name: ${userName}`, 20 * scale, 240 * scale);
            ctx.fillText(`Token: ${token}`, 20 * scale, 260 * scale);
            ctx.fillText(`Time: ${timestamp}`, 20 * scale, 280 * scale);
            ctx.textAlign = 'right';
            ctx.fillText(`Code: ${downloadCode}`, canvas.width - 20 * scale, 20 * scale);
        }

        // Minting logic
        async function startMinting() {
            userIdGlobal = document.getElementById('widgetUserId').value;
            userNameGlobal = document.getElementById('widgetUserName').value;

            if (!userIdGlobal || !userNameGlobal) {
                alert('Please enter both Wallet Address and Name!');
                return;
            }

            const mintBtn = document.getElementById('widgetMintBtn');
            mintBtn.textContent = 'Minting...';
            mintBtn.disabled = true;

            setTimeout(async () => {
                // Generate token data
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#&$';
                generatedToken = generateSecureRandomString(20, chars);
                const alphaNumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                alphaNumericNumber = generateSecureRandomString(18, alphaNumChars);
                tokenValue = (10 + Math.random() * 290).toFixed(2); // 10–300 coins
                timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
                tokenHash = await computeSHA256(`${alphaNumericNumber}${timestamp}`);
                downloadCode = generateSecureRandomString(4, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

                // Draw token
                drawTokenImage(userIdGlobal, userNameGlobal, generatedToken, alphaNumericNumber, tokenValue, timestamp, tokenHash);

                // Update UI
                mintBtn.textContent = 'Mint Again';
                mintBtn.disabled = false;
                document.getElementById('widgetDownloadBtn').style.display = 'block';
            }, 2000); // Simulated delay
        }

        // Download logic
        function downloadImage() {
            const userInputCode = prompt('Enter the 4-character code from the token image:');
            if (userInputCode !== downloadCode) {
                alert('Incorrect code!');
                return;
            }

            const canvas = document.getElementById('widgetTokenCanvas');
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `NFT_${alphaNumericNumber}_${timestamp.replace(/:/g, '-')}.png`;
            link.click();
        }

        // Event listeners
        document.getElementById('widgetMintBtn').addEventListener('click', startMinting);
        document.getElementById('widgetDownloadBtn').addEventListener('click', downloadImage);

        // Responsive resizing
        window.addEventListener('resize', () => {
            if (generatedToken) {
                resizeCanvas(document.getElementById('widgetTokenCanvas'));
                drawTokenImage(userIdGlobal, userNameGlobal, generatedToken, alphaNumericNumber, tokenValue, timestamp, tokenHash);
            }
        });
    }

    // Expose the widget globally
    window.EmojiNFTWidget = { init: initEmojiNFTWidget };
})();
