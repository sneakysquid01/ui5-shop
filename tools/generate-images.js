// Generates placeholder product images (one SVG per angle) from webapp/model/products.json
// Run with: node tools/generate-images.js

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const productsFile = path.join(root, "webapp", "model", "products.json");
const outputDir = path.join(root, "webapp", "images", "products");

const palette = ["#0070f2", "#7b3fe4", "#e9730c", "#188918", "#d04343", "#0f828f",
	"#5d36ff", "#c0399f", "#1a9898", "#bb0000", "#256f3a", "#6c32a9"];

const angles = {
	front: "Front view",
	side: "Side view",
	back: "Back view",
	detail: "Close-up"
};

function darken(hex, amount) {
	const num = parseInt(hex.slice(1), 16);
	const r = Math.max(0, (num >> 16) - amount);
	const g = Math.max(0, ((num >> 8) & 0xff) - amount);
	const b = Math.max(0, (num & 0xff) - amount);
	return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

// a different simple shape per angle, so sliding visibly changes the image
function shape(angle) {
	switch (angle) {
		case "front":
			return '<circle cx="300" cy="250" r="120" fill="rgba(255,255,255,0.9)"/>';
		case "side":
			return '<rect x="250" y="130" width="100" height="240" rx="30" fill="rgba(255,255,255,0.9)"/>';
		case "back":
			return '<rect x="170" y="150" width="260" height="200" rx="30" fill="rgba(255,255,255,0.9)"/>';
		default:
			return '<circle cx="300" cy="250" r="120" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="18"/>' +
				'<circle cx="300" cy="250" r="55" fill="rgba(255,255,255,0.9)"/>';
	}
}

function escapeXml(text) {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const { Products } = JSON.parse(fs.readFileSync(productsFile, "utf8"));
fs.mkdirSync(outputDir, { recursive: true });

Products.forEach((product, index) => {
	const color = palette[index % palette.length];
	const dark = darken(color, 60);

	Object.entries(angles).forEach(([angle, label]) => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="${color}"/>
			<stop offset="1" stop-color="${dark}"/>
		</linearGradient>
	</defs>
	<rect width="600" height="600" fill="url(#bg)"/>
	${shape(angle)}
	<text x="300" y="470" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="bold" fill="#ffffff">${escapeXml(product.name)}</text>
	<text x="300" y="520" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.85)">${label}</text>
</svg>`;
		fs.writeFileSync(path.join(outputDir, `${product.productId}-${angle}.svg`), svg);
	});
});

console.log(`Generated ${Products.length * Object.keys(angles).length} images in ${outputDir}`);