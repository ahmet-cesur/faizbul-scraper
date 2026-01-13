/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable this if you want to use images from specific domains
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    serverExternalPackages: ['google-spreadsheet', 'google-auth-library'],
};

export default nextConfig;
