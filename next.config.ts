import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // "Meine Anfragen" ist in den Buchen-Bereich integriert; alte Links
    // (z. B. aus bereits verschickten Ergebnis-Mails) sollen weiter funktionieren.
    return [
      { source: "/meine-anfragen", destination: "/buchen", permanent: true },
      { source: "/meine-anfragen/:id", destination: "/buchen/anfragen/:id", permanent: true },
    ];
  },
};

export default nextConfig;
