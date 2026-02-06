// Display Configuration
// Modify these settings to customize the game display

const CONFIG = {
    display: {
        // Aspect ratios
        landscapeAspectRatio: 16 / 9,  // Desktop/landscape mode (16:9)
        portraitAspectRatio: 9 / 16,   // Mobile portrait mode (9:16)

        // Mobile detection
        mobileMaxWidth: 768,           // Width threshold for mobile detection (px)

        // Canvas scaling
        maxScale: 1.0,                 // Maximum scale factor (1.0 = 100%)
        minScale: 0.5,                 // Minimum scale factor
    },

    ui: {
        // Health/Stamina/Money bars
        barWidth: 100,
        barHeight: 15,
        barPadding: 20,
        barSpacing: 5,
        barBorderWidth: 1.5,
        barBorderRadius: 2.5,
        barOpacity: 0.7,

        // Colors
        healthBarColor: '#ff0000',
        staminaBarColor: '#00ff00',
        moneyBarColor: '#ffff00',
        mineBarColor: '#c0c0c0',
        barBackgroundColor: '#333333',
        barBorderColor: '#ffff00',
    }
};
