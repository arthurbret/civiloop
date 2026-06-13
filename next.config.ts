import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les JSON générés (data/generated) sont lus via fs à la demande :
  // on garde le rendu dynamique par défaut pour les 7000+ scrutins.
};

export default nextConfig;
