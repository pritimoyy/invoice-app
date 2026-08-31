import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * fontkit reads the Archivo .ttf files off disk at request time (see
   * lib/pdf/fonts/register.ts), not via import(), so Vercel's serverless
   * file tracer cannot see the reference and would ship the function
   * without them — PDF generation then fails in production while working
   * locally. Listing them explicitly is what keeps them in the bundle.
   *
   * Applied to every route rather than just the two /pdf handlers: the
   * send action renders and caches a PDF too, and a server action is
   * traced with the route that invokes it. 560KB total, once.
   */
  outputFileTracingIncludes: {
    "/**": ["./lib/pdf/fonts/*.ttf"],
  },
};

export default nextConfig;
