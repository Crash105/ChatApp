/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', 'unpdf', '@pinecone-database/pinecone'],
  },
};

export default nextConfig;
