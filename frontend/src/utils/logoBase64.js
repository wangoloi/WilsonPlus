// This file contains the base64 encoded version of the WilsonPlus logo
// To generate this, you can use an online tool or convert the PNG to base64
// For now, this is a placeholder - you'll need to convert the actual logo

export const LOGO_BASE64 = ""; // TODO: Convert wilsonplus_logo.png to base64

// Alternative: You can also create a simple text-based logo
export const createTextLogo = (doc, x, y) => {
  doc.setFontSize(16);
  doc.setTextColor(27, 101, 246); // Primary color #1b65f6
  doc.text("WP", x, y); // Simple initials instead of emoji
  doc.setFontSize(12);
  doc.setTextColor(27, 101, 246);
  doc.text("WilsonPlus", x + 25, y);
};
