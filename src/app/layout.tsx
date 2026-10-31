import type { Metadata } from "next";
import { WorkspaceProviders } from "@/components/reloop-ui/WorkspaceProviders";
import "./globals.css";
import "./reloop-ui.css";

export const metadata: Metadata = {
  title: "ReLoop AI | Claim to Action",
  description: "Evidence-linked customer resolution and cross-platform listing correction.",
  icons: {
    icon: ["/favicon.ico", { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US">
      <body>
        <WorkspaceProviders>{children}</WorkspaceProviders>
      </body>
    </html>
  );
}
